;; =============================================================================
;; LEND402-VAULT.CLAR
;; Just-In-Time Micro-Lending Protocol for AI Agents on Stacks (Nakamoto)
;; Version: 1.0.0
;; Clarity Version: 4
;; =============================================================================
;; OVERVIEW:
;;   AI agents hold sBTC as a treasury asset. When a paywalled API returns a
;;   402 Payment Required demanding USDCx, this vault atomically:
;;     1. Verifies the live sBTC/USD oracle price (enforcing 150% collateral ratio)
;;     2. Locks the agent's sBTC as collateral
;;     3. Draws USDCx from the LP liquidity pool
;;     4. Routes the exact USDCx amount directly to the merchant
;;   All state transitions are atomic and guarded by rigorous invariant checks.
;; =============================================================================

;; ---------------------------------------------------------------------------
;; SECTION 0: SIP-010 FUNGIBLE TOKEN TRAIT
;; ---------------------------------------------------------------------------

(define-trait sip-010-trait
  (
    ;; Transfer tokens from sender to recipient.
    (transfer (uint principal principal (optional (buff 34))) (response bool uint))
    ;; Get the human-readable name of the token.
    (get-name () (response (string-ascii 32) uint))
    ;; Get the ticker symbol of the token.
    (get-symbol () (response (string-ascii 32) uint))
    ;; Get the number of decimals.
    (get-decimals () (response uint uint))
    ;; Get the balance of the given principal.
    (get-balance (principal) (response uint uint))
    ;; Get the total supply of the token.
    (get-total-supply () (response uint uint))
    ;; Get the URI for the token metadata.
    (get-token-uri () (response (optional (string-utf8 256)) uint))
  )
)

;; ---------------------------------------------------------------------------
;; SECTION 1: ORACLE DEPENDENCY
;; ---------------------------------------------------------------------------
;; DIA publishes Stacks-native spot prices as { value, timestamp } tuples.

;; ---------------------------------------------------------------------------
;; SECTION 2: CONSTANTS
;; ---------------------------------------------------------------------------

;; Contract owner / governance
(define-constant CONTRACT-OWNER tx-sender)

;; SIP-010 token contract addresses (Stacks mainnet)
;; USDCx: Circle xReserve native USDC on Stacks
(define-constant USDCX-CONTRACT   'SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx)
;; sBTC: Non-custodial 1:1 Bitcoin-backed asset
(define-constant SBTC-CONTRACT    'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token)

;; DIA oracle contract for sBTC/USD spot pricing.
(define-constant DIA-ORACLE-CONTRACT 'SP1G48FZ4Y7JY8G2Z0N51QTCYGBQ6F4J43J77BQC0.dia-oracle)

;; Collateral parameters (basis points, 10000 = 100%)
(define-constant COLLATERAL-RATIO-BPS     u15000)  ;; 150% minimum collateral ratio
(define-constant LIQUIDATION-RATIO-BPS    u12500)  ;; 125% liquidation threshold
(define-constant LIQUIDATION-BONUS-BPS    u500)  ;; 5% bonus for liquidators
(define-constant PROTOCOL-FEE-BPS         u30)   ;; 0.30% origination fee to treasury
(define-constant LP-INTEREST-RATE-BPS     u200)  ;; 2.00% annualized base rate to LPs

;; Interest accrual uses block-time (Nakamoto: ~5 seconds per fast-block)
;; Annual seconds = 365 * 24 * 60 * 60 = 31536000
(define-constant SECONDS-PER-YEAR        u31536000)

;; Precision multiplier for fixed-point arithmetic (1e8)
(define-constant PRECISION               u100000000)

;; Maximum oracle staleness: 60 seconds
(define-constant MAX-ORACLE-AGE-SECONDS  u60)

;; Asset identifiers for oracle lookups.
(define-constant SBTC-DIA-PAIR "sBTC/USD")
;; USDCx is treated at $1.00 nominal value (8 decimals).
(define-constant USDCX-PRICE-USD8 u100000000)

;; Token decimal scales
(define-constant SBTC-DECIMALS   u8)   ;; sBTC has 8 decimals (satoshi-aligned)
(define-constant USDCX-DECIMALS  u6)   ;; USDCx has 6 decimals (USDC-aligned)

;; Minimum borrow amount: 1.00 USDCx (prevents dust attacks)
(define-constant MIN-BORROW-AMOUNT u1000000)

;; Maximum single borrow: 10,000 USDCx (circuit breaker)
(define-constant MAX-BORROW-AMOUNT u10000000000)

;; ---------------------------------------------------------------------------
;; SECTION 3: ERROR CODES
;; ---------------------------------------------------------------------------

(define-constant ERR-NOT-AUTHORIZED          (err u100))
(define-constant ERR-PAUSED                  (err u101))
(define-constant ERR-INVALID-AMOUNT          (err u102))
(define-constant ERR-INSUFFICIENT-COLLATERAL (err u103))
(define-constant ERR-INSUFFICIENT-LIQUIDITY  (err u104))
(define-constant ERR-ORACLE-STALE            (err u105))
(define-constant ERR-ORACLE-FAILURE          (err u106))
(define-constant ERR-POSITION-NOT-FOUND      (err u107))
(define-constant ERR-POSITION-HEALTHY        (err u108))
(define-constant ERR-POSITION-EXISTS         (err u109))
(define-constant ERR-TRANSFER-FAILED         (err u110))
(define-constant ERR-ARITHMETIC-OVERFLOW     (err u111))
(define-constant ERR-BELOW-MIN-BORROW        (err u112))
(define-constant ERR-ABOVE-MAX-BORROW        (err u113))
(define-constant ERR-REPAY-EXCEEDS-DEBT      (err u114))
(define-constant ERR-ZERO-COLLATERAL         (err u115))
(define-constant ERR-LP-ALREADY-DEPOSITED    (err u116))
(define-constant ERR-LP-NO-DEPOSIT           (err u117))
(define-constant ERR-WITHDRAWAL-TOO-LARGE    (err u118))
(define-constant ERR-PRICE-ZERO              (err u119))
(define-constant ERR-MERCHANT-INVALID        (err u120))

;; ---------------------------------------------------------------------------
;; SECTION 4: VAULT STATE - DATA VARIABLES
;; ---------------------------------------------------------------------------

;; Circuit breaker: halts all mutations when true
(define-data-var vault-paused bool false)

;; Cumulative USDCx deposited by LPs (tracked separately from borrowed-out)
(define-data-var total-lp-deposits uint u0)

;; USDCx currently lent out (sum of all active loan principals)
(define-data-var total-borrowed uint u0)

;; USDCx collected as protocol origination fees (pending withdrawal by owner)
(define-data-var protocol-fee-reserve uint u0)

;; sBTC currently locked as collateral (sum of all active positions)
(define-data-var total-collateral-locked uint u0)

;; Monotonically-increasing loan nonce for unique position IDs
(define-data-var loan-nonce uint u0)

;; Accumulated interest index: starts at PRECISION (1.0), grows over time.
;; Represents cumulative (1 + rate)^t since vault deployment.
(define-data-var global-interest-index uint PRECISION)

;; Block-time (unix seconds) when interest index was last updated
(define-data-var last-accrual-time uint u0)

;; Cached sBTC/USD price and timestamp for read-only quote paths.
;; Mutating paths refresh this cache from DIA before using the value.
(define-data-var cached-sbtc-price uint u0)
(define-data-var cached-sbtc-price-updated-at uint u0)

;; ---------------------------------------------------------------------------
;; SECTION 5: VAULT STATE - DATA MAPS
;; ---------------------------------------------------------------------------

;; LP deposit record
;; key: LP principal
;; value: { deposited-usdcx: uint, deposit-index: uint, deposit-time: uint }
;;   deposit-index: snapshot of global-interest-index at deposit time (for yield calc)
(define-map lp-deposits
  principal
  {
    deposited-usdcx : uint,
    deposit-index   : uint,
    deposit-time    : uint
  }
)

;; Borrow position record
;; key: { borrower: principal, loan-id: uint }
;; value: full position state
(define-map borrow-positions
  { borrower: principal, loan-id: uint }
  {
    collateral-sbtc    : uint,   ;; sBTC locked (satoshis, 8 decimals)
    principal-usdcx    : uint,   ;; USDCx borrowed (6 decimals)
    borrow-index       : uint,   ;; global-interest-index at origination
    origination-time   : uint,   ;; unix timestamp (block-time) at origination
    merchant-address   : principal, ;; merchant who received the payment
    is-active          : bool
  }
)

;; Latest active loan-id per borrower (agents typically carry one at a time)
;; Allows O(1) lookups in the common single-loan case
(define-map borrower-active-loan
  principal
  uint
)

;; Reverse index for the currently active borrower behind a loan-id.
;; This lets close-out flows resolve write keys from contract state instead of
;; trusting caller-supplied principals.
(define-map active-loan-borrower
  uint
  principal
)

;; ---------------------------------------------------------------------------
;; SECTION 6: PRIVATE HELPERS - ARITHMETIC
;; ---------------------------------------------------------------------------

;; Multiply two fixed-point values (both scaled by PRECISION), return at PRECISION scale
(define-private (fp-mul (a uint) (b uint))
  (/ (* a b) PRECISION)
)

;; Divide two fixed-point values (both scaled by PRECISION), return at PRECISION scale
(define-private (fp-div (a uint) (b uint))
  (if (is-eq b u0)
    u0
    (/ (* a PRECISION) b)
  )
)

;; Basis-points multiplication: result = (value * bps) / 10000
(define-private (bps-of (value uint) (bps uint))
  (/ (* value bps) u10000)
)

;; Safe addition with overflow detection
(define-private (safe-add (a uint) (b uint))
  (let ((result (+ a b)))
    (asserts! (>= result a) ERR-ARITHMETIC-OVERFLOW)
    (ok result)
  )
)

;; ---------------------------------------------------------------------------
;; SECTION 7: PRIVATE HELPERS - INTEREST ACCRUAL
;; ---------------------------------------------------------------------------

;; Compute the elapsed time since last accrual (capped to prevent runaway index).
;; Returns seconds elapsed.
(define-private (elapsed-seconds)
  (let
    (
      (now        stacks-block-time)  ;; Nakamoto: block-time
      (last-time  (var-get last-accrual-time))
    )
    ;; If vault is freshly deployed, seed last-accrual-time
    (if (is-eq last-time u0)
      u0
      (if (> now last-time) (- now last-time) u0)
    )
  )
)

;; Linear interest approximation for the accrual period.
;; index_new = index_old * (1 + rate * dt / SECONDS_PER_YEAR)
;; Uses first-order Taylor expansion for gas efficiency.
;; rate = LP_INTEREST_RATE_BPS (2% per year in basis points)
;;
;; Returns the new index value (scaled by PRECISION).
(define-private (compute-new-index (dt uint))
  (let
    (
      (old-index  (var-get global-interest-index))
      ;; accrued-factor = (rate_bps / 10000) * (dt / SECONDS_PER_YEAR) * PRECISION
      (numerator  (* LP-INTEREST-RATE-BPS dt))
      (denominator (* u10000 SECONDS-PER-YEAR))
      (rate-factor (if (is-eq denominator u0)
                     u0
                     (/ (* numerator PRECISION) denominator)))
      (new-index  (+ old-index (fp-mul old-index rate-factor)))
    )
    new-index
  )
)

;; Accrue interest globally. Updates global-interest-index and last-accrual-time.
;; Must be called at the start of any state-mutating public function.
(define-private (accrue-interest)
  (let
    (
      (dt         (elapsed-seconds))
      (new-index  (compute-new-index dt))
      (now        stacks-block-time)
    )
    (var-set global-interest-index new-index)
    (var-set last-accrual-time now)
    true
  )
)

;; Compute outstanding debt for a position including accrued interest.
;; debt = principal * (current_index / borrow_index)
(define-private (compute-debt (principal-usdcx uint) (borrow-index uint))
  (if (is-eq borrow-index u0)
    principal-usdcx
    (fp-mul principal-usdcx (fp-div (var-get global-interest-index) borrow-index))
  )
)

;; ---------------------------------------------------------------------------
;; SECTION 8: PRIVATE HELPERS - ORACLE & COLLATERAL
;; ---------------------------------------------------------------------------

;; Fetch a validated live sBTC/USD price from the DIA oracle.
;; Public state-mutating flows can call this helper and persist the result locally.
(define-private (fetch-live-sbtc-price)
  (let
    (
      (price-data (unwrap-panic (contract-call? 'SP1G48FZ4Y7JY8G2Z0N51QTCYGBQ6F4J43J77BQC0.dia-oracle get-value SBTC-DIA-PAIR)))
    )
    (let
      (
        (now         stacks-block-time)
        (ts-sec      (/ (get timestamp price-data) u1000))
        (px          (get value price-data))
        (age         (if (>= now ts-sec) (- now ts-sec) u0))
      )
      (asserts! (<= age MAX-ORACLE-AGE-SECONDS) ERR-ORACLE-STALE)
      (asserts! (> px u0) ERR-PRICE-ZERO)
      (ok { price: px, timestamp: ts-sec })
    )
  )
)

;; Persist a freshly validated oracle observation for read-only quote paths.
(define-private (cache-sbtc-price (price uint) (timestamp uint))
  (begin
    (var-set cached-sbtc-price price)
    (var-set cached-sbtc-price-updated-at timestamp)
    true
  )
)

;; Read-only quote paths use the cached price to stay Clarinet-compatible.
(define-read-only (get-validated-cached-sbtc-price)
  (let
    (
      (price (var-get cached-sbtc-price))
      (ts    (var-get cached-sbtc-price-updated-at))
      (now   stacks-block-time)
    )
    (asserts! (> price u0) ERR-PRICE-ZERO)
    (asserts! (<= (if (>= now ts) (- now ts) u0) MAX-ORACLE-AGE-SECONDS) ERR-ORACLE-STALE)
    (ok price)
  )
)

;; Convert sBTC collateral (8 decimals) to USDCx equivalent (6 decimals)
;; using current oracle prices.
;;
;; collateral_usdcx = collateral_sbtc * sbtc_price / usdcx_price
;;                  * (10^usdcx_decimals / 10^sbtc_decimals)
;;
;; Since both prices are 8-decimal oracle values, and sbtc is 8-dec, usdcx is 6-dec:
;; collateral_usdcx = (collateral_sbtc * sbtc_price) / (usdcx_price * 100)
;;
(define-private (sbtc-to-usdcx-value
    (collateral-sbtc uint)
    (sbtc-price uint)
    (usdcx-price uint))
  (if (or (is-eq usdcx-price u0) (is-eq sbtc-price u0))
    u0
    ;; Normalise decimal mismatch: sbtc(8) -> usdcx(6) means divide by 100
    (/ (* collateral-sbtc sbtc-price) (* usdcx-price u100))
  )
)

;; Return true if the position's current collateral ratio >= threshold_bps
(define-private (is-position-healthy
    (collateral-sbtc uint)
    (debt-usdcx uint)
    (sbtc-price uint)
    (usdcx-price uint)
    (threshold-bps uint))
  (let
    (
      (collateral-value (sbtc-to-usdcx-value collateral-sbtc sbtc-price usdcx-price))
      ;; required collateral = debt * threshold_bps / 10000
      (required-collateral (bps-of debt-usdcx threshold-bps))
    )
    (>= collateral-value required-collateral)
  )
)

;; Compute the minimum sBTC collateral required for a given USDCx borrow.
;; min_sbtc = borrow_usdcx * (COLLATERAL_RATIO / 10000) * (usdcx_price / sbtc_price) * 100
(define-private (min-collateral-for-borrow
    (borrow-usdcx uint)
    (sbtc-price uint)
    (usdcx-price uint))
  (if (or (is-eq sbtc-price u0) (is-eq usdcx-price u0))
    u0
    ;; Invert the sbtc-to-usdcx conversion and apply ratio
    ;; required_collateral_usdcx = borrow * RATIO / 10000
    ;; required_sbtc = required_collateral_usdcx * usdcx_price * 100 / sbtc_price
    (let ((required-usdcx-value (bps-of borrow-usdcx COLLATERAL-RATIO-BPS)))
      (/ (* (* required-usdcx-value usdcx-price) u100) sbtc-price)
    )
  )
)

;; ---------------------------------------------------------------------------
;; SECTION 9: PRIVATE HELPERS - TOKEN OPS
;; ---------------------------------------------------------------------------

;; Transfer USDCx from this contract to a recipient.
;; Wraps contract-call to the SIP-010 USDCx contract.
(define-private (transfer-usdcx-out
    (amount uint)
    (recipient principal))
  (contract-call? 'SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx transfer amount current-contract recipient none)
)

;; Transfer sBTC from a sender to this contract.
(define-private (transfer-sbtc-in
    (amount uint)
    (sender principal))
  (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token transfer amount sender current-contract none)
)

;; Transfer sBTC from this contract back to a recipient.
(define-private (transfer-sbtc-out
    (amount uint)
    (recipient principal))
  (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token transfer amount current-contract recipient none)
)

;; Transfer USDCx from an LP into this contract.
(define-private (transfer-usdcx-in
    (amount uint)
    (sender principal))
  (contract-call? 'SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx transfer amount sender current-contract none)
)

;; ---------------------------------------------------------------------------
;; SECTION 10: ADMIN - GOVERNANCE & CIRCUIT BREAKER
;; ---------------------------------------------------------------------------

;; Pause all vault mutations. Emergency-only.
(define-public (pause-vault)
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set vault-paused true)
    (ok true)
  )
)

;; Resume vault operations.
(define-public (unpause-vault)
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set vault-paused false)
    (ok true)
  )
)

;; Withdraw accumulated protocol fees to owner.
(define-public (collect-protocol-fees)
  (let
    (
      (fees (var-get protocol-fee-reserve))
    )
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (> fees u0) ERR-INVALID-AMOUNT)
    (var-set protocol-fee-reserve u0)
    (unwrap! (transfer-usdcx-out fees CONTRACT-OWNER) ERR-TRANSFER-FAILED)
    (ok fees)
  )
)

;; Refresh the cached sBTC/USD oracle observation used by read-only quote paths.
;; Anyone can call this to keep read-only simulate-borrow and health checks warm.
(define-public (refresh-price-cache)
  (let
    (
      (price-data (unwrap! (fetch-live-sbtc-price) ERR-ORACLE-FAILURE))
      (price      (get price price-data))
      (timestamp  (get timestamp price-data))
    )
    (cache-sbtc-price price timestamp)
    (print {
      event           : "refresh-price-cache",
      sbtc-price-usd8 : price,
      timestamp       : timestamp
    })
    (ok price-data)
  )
)

;; ---------------------------------------------------------------------------
;; SECTION 11: LIQUIDITY PROVIDER INTERFACE
;; ---------------------------------------------------------------------------

;; LP deposits USDCx into the vault to fund agent loans.
;; LP earns LP-INTEREST-RATE-BPS annualized yield, tracked via interest index.
;;
;; @param amount-usdcx  USDCx amount (6 decimal places, e.g. u1000000 = $1.00)
(define-public (deposit-liquidity (amount-usdcx uint))
  (let
    (
      (accrued-interest (accrue-interest))
      (depositor tx-sender)
      (now       stacks-block-time)
    )
    ;; Guards
    (asserts! (not (var-get vault-paused))           ERR-PAUSED)
    (asserts! (> amount-usdcx u0)                    ERR-INVALID-AMOUNT)
    (asserts! (is-none (map-get? lp-deposits depositor)) ERR-LP-ALREADY-DEPOSITED)

    ;; Pull USDCx from depositor
    (unwrap! (transfer-usdcx-in amount-usdcx depositor) ERR-TRANSFER-FAILED)

    ;; Record deposit at current index
    (map-set lp-deposits depositor
      {
        deposited-usdcx : amount-usdcx,
        deposit-index   : (var-get global-interest-index),
        deposit-time    : now
      }
    )
    (var-set total-lp-deposits (+ (var-get total-lp-deposits) amount-usdcx))

    (print {
      event           : "deposit-liquidity",
      depositor       : depositor,
      amount-usdcx    : amount-usdcx,
      index-snapshot  : (var-get global-interest-index),
      timestamp       : now
    })
    (ok amount-usdcx)
  )
)

;; LP withdraws their deposit plus accrued yield.
;; Yield = principal * (current_index / deposit_index) - principal
;;
;; @param amount-usdcx  USDCx to withdraw. Pass u0 to withdraw entire balance + yield.
(define-public (withdraw-liquidity (amount-usdcx uint))
  (let
    (
      (accrued-interest (accrue-interest))
      (depositor     tx-sender)
      (deposit-entry (unwrap! (map-get? lp-deposits depositor) ERR-LP-NO-DEPOSIT))
      (dep-amount    (get deposited-usdcx deposit-entry))
      (dep-index     (get deposit-index   deposit-entry))
      ;; Compute principal + yield
      (current-index (var-get global-interest-index))
      (accrued-total (fp-mul dep-amount (fp-div current-index dep-index)))
      (withdraw-amt  (if (is-eq amount-usdcx u0) accrued-total amount-usdcx))
      ;; Available liquidity = total deposits - total borrowed out
      (free-liquidity (- (var-get total-lp-deposits) (var-get total-borrowed)))
    )
    ;; Guards
    (asserts! (not (var-get vault-paused))           ERR-PAUSED)
    (asserts! (<= withdraw-amt accrued-total)         ERR-WITHDRAWAL-TOO-LARGE)
    (asserts! (<= withdraw-amt free-liquidity)        ERR-INSUFFICIENT-LIQUIDITY)

    ;; If full withdrawal, delete record; else update deposit amount
    (if (is-eq withdraw-amt accrued-total)
      (map-delete lp-deposits depositor)
      (map-set lp-deposits depositor
        {
          deposited-usdcx : (- dep-amount (fp-mul dep-amount (fp-div withdraw-amt accrued-total))),
          deposit-index   : current-index,
          deposit-time    : (get deposit-time deposit-entry)
        }
      )
    )
    (var-set total-lp-deposits
      (if (>= (var-get total-lp-deposits) dep-amount)
        (- (var-get total-lp-deposits) dep-amount)
        u0))

    ;; Transfer USDCx to LP
    (unwrap! (transfer-usdcx-out withdraw-amt depositor) ERR-TRANSFER-FAILED)

    (print {
      event          : "withdraw-liquidity",
      depositor      : depositor,
      withdrawn      : withdraw-amt,
      yield-earned   : (- accrued-total dep-amount),
      timestamp      : stacks-block-time
    })
    (ok withdraw-amt)
  )
)

;; ---------------------------------------------------------------------------
;; SECTION 12: CORE - BORROW-AND-PAY (The JIT Atomic Loan)
;; ---------------------------------------------------------------------------
;;
;; This is the canonical entry point called by the Lend402 agent SDK.
;;
;; CALLER: The Lend402 gateway, acting on behalf of the AI agent, submits
;; this transaction after receiving a signed payload in the x402
;; `payment-signature` header. The gateway validates the signed transaction
;; (contract address, function name, arguments, amounts) before broadcast.
;;
;; ATOMICITY GUARANTEE:
;; Clarity's execution model guarantees that if ANY step fails -- oracle stale,
;; collateral insufficient, transfer rejected -- the ENTIRE transaction reverts.
;; No partial state is possible. Either the agent pays the merchant and the
;; sBTC is locked, or nothing happens.
;;
;; EXTERNAL POST-CONDITION ENFORCEMENT (SDK layer):
;; The agent SDK signs the Stacks transaction with PostConditionMode.Deny and
;; two explicit post-conditions (enforced by the Stacks protocol before the
;; contract even executes):
;;   1. makeStandardFungiblePostCondition(agent, Equal, collateral-sbtc, sBTC)
;;      -> Agent's wallet MUST send exactly collateral-sbtc satoshis of sBTC.
;;        If the contract attempts to move more or less, the tx is aborted.
;;   2. makeContractFungiblePostCondition(vault, Equal, net-payment, USDCx)
;;      -> The vault contract MUST send exactly net-payment micro-USDCx to merchant.
;;        Prevents the contract from routing funds elsewhere or retaining more.
;; These post-conditions are the agent's cryptographic guarantee before signing.
;;
;; INTERNAL INVARIANT ENFORCEMENT (contract layer, below):
;; The contract independently verifies every invariant before touching balances:
;;   - Oracle price is live (fetched from DIA on-chain, staleness <= 60 s)
;;   - Collateral ratio >= 150% at the current oracle price
;;   - LP pool has enough free liquidity to service the borrow
;;   - Borrower has no existing open position (one active loan per agent)
;;   - Merchant is not the borrower (prevents self-dealing)
;;
;; FLOW:
;;   1. Accrue global interest index (updates LP yield state)
;;   2. Validate inputs and circuit breaker (paused, bounds, single-loan)
;;   3. Fetch + validate DIA oracle price (staleness <= MAX-ORACLE-AGE-SECONDS)
;;   4. Collateral ratio check: collateral-sbtc >= min_required at live price
;;   5. Liquidity check: free LP capital >= amount-usdcx
;;   6. Compute origination fee (0.30% of borrow amount -> protocol treasury)
;;   7. LOCK: Transfer collateral-sbtc from agent into vault (sBTC in)
;;   8. PAY:  Transfer net USDCx from vault to merchant-address (USDCx out)
;;   9. Update accounting: total-borrowed, total-collateral-locked, fee reserve
;;  10. Record borrow position with interest-index snapshot for debt accrual
;;  11. Emit structured print event for off-chain indexers
;;
;; UNDERCOLLATERALISATION HANDLING:
;; If collateral-sbtc < min-sbtc-required at the live oracle price, the
;; function fails with ERR-INSUFFICIENT-COLLATERAL (u103) and reverts.
;; The agent SDK pre-computes min-sbtc-required via the read-only
;; simulate-borrow function before signing, so this guard only fires if the
;; oracle price moved adversely between simulation and broadcast.
;;
;; @param amount-usdcx      USDCx to borrow and pay (6 decimals; 1_000_000 = $1.00)
;; @param merchant-address  The API provider's Stacks principal receiving USDCx
;; @param collateral-sbtc   sBTC to lock as collateral (8 decimals; satoshis)
(define-public (borrow-and-pay
    (amount-usdcx    uint)
    (merchant-address principal)
    (collateral-sbtc  uint))
  (let
    (
      ;; -- Step 1: Accrue interest -------------------------------------------
      ;; Must run first so the global-interest-index reflects the current block
      ;; before any position is opened or checked against it.
      (accrued-interest  (accrue-interest))
      (borrower          tx-sender)
      (now               stacks-block-time)

      ;; -- Step 2: Input validation & circuit breaker ------------------------
      ;; ERR-PAUSED (101): owner has halted the vault (emergency stop).
      (guard-paused      (asserts! (not (var-get vault-paused))            ERR-PAUSED))
      ;; ERR-BELOW-MIN-BORROW (112): dust guard -- minimum 1.00 USDCx.
      (guard-min-borrow  (asserts! (>= amount-usdcx MIN-BORROW-AMOUNT)     ERR-BELOW-MIN-BORROW))
      ;; ERR-ABOVE-MAX-BORROW (113): single-call circuit breaker -- max 10 000 USDCx.
      (guard-max-borrow  (asserts! (<= amount-usdcx MAX-BORROW-AMOUNT)     ERR-ABOVE-MAX-BORROW))
      ;; ERR-ZERO-COLLATERAL (115): collateral must be positive.
      (guard-collateral  (asserts! (> collateral-sbtc u0)                  ERR-ZERO-COLLATERAL))
      ;; ERR-POSITION-EXISTS (109): one active loan per agent at a time.
      ;; This prevents a single agent from draining the pool across concurrent calls.
      (guard-single-loan (asserts! (is-none (map-get? borrower-active-loan borrower)) ERR-POSITION-EXISTS))
      ;; ERR-MERCHANT-INVALID (120): agent cannot pay themselves.
      (guard-merchant    (asserts! (not (is-eq merchant-address borrower)) ERR-MERCHANT-INVALID))

      ;; -- Step 3: Oracle price fetch & staleness validation -----------------
      ;; fetch-live-sbtc-price calls DIA on-chain and asserts:
      ;;   (a) price > 0
      ;;   (b) now - timestamp <= MAX-ORACLE-AGE-SECONDS (60 s)
      ;; If either assertion fails -> ERR-ORACLE-STALE (105) or ERR-PRICE-ZERO (119).
      ;; This is a live on-chain read -- the cached price is NOT used here.
      (sbtc-price-data   (unwrap! (fetch-live-sbtc-price) ERR-ORACLE-FAILURE))
      (sbtc-price        (get price sbtc-price-data))       ;; sBTC/USD, 8 decimals
      (sbtc-price-ts     (get timestamp sbtc-price-data))
      ;; USDCx is pegged at $1.00 (100_000_000 in 8-decimal representation).
      (usdcx-price       USDCX-PRICE-USD8)

      ;; -- Step 4: Collateral ratio check ------------------------------------
      ;; min_sbtc = borrow_usdcx * (COLLATERAL_RATIO / 10000)
      ;;              * (usdcx_price / sbtc_price) * 100
      ;; The *100 term normalises the 8-decimal sBTC to 6-decimal USDCx.
      ;; At $100k sBTC and $0.50 USDCx price: borrowing $0.50 requires
      ;; 0.50 * 1.50 / 100000 * 100 = 750 satoshis minimum collateral.
      ;;
      ;; ERR-INSUFFICIENT-COLLATERAL (103): the submitted collateral-sbtc
      ;; does not cover 150% of amount-usdcx at the current oracle price.
      ;; The agent SDK pre-simulates this via simulate-borrow (read-only),
      ;; so this guard only triggers if the oracle price fell between
      ;; simulation time and broadcast confirmation.
      (min-sbtc-required (min-collateral-for-borrow amount-usdcx sbtc-price usdcx-price))
      (guard-ratio       (asserts! (>= collateral-sbtc min-sbtc-required) ERR-INSUFFICIENT-COLLATERAL))

      ;; -- Step 5: LP liquidity availability check ---------------------------
      ;; free-liquidity = total LP deposits - total currently borrowed out.
      ;; ERR-INSUFFICIENT-LIQUIDITY (104): the pool cannot fund this borrow.
      (free-liquidity    (- (var-get total-lp-deposits) (var-get total-borrowed)))
      (guard-liquidity   (asserts! (>= free-liquidity amount-usdcx)     ERR-INSUFFICIENT-LIQUIDITY))

      ;; -- Step 6: Fee computation -------------------------------------------
      ;; protocol-fee = amount * PROTOCOL_FEE_BPS / 10000  (= 0.30%)
      ;; net-payment  = amount - protocol-fee
      ;; The merchant receives net-payment; the fee accrues in protocol-fee-reserve
      ;; pending collection by the owner via collect-protocol-fees.
      (protocol-fee      (bps-of amount-usdcx PROTOCOL-FEE-BPS))
      (net-payment       (- amount-usdcx protocol-fee))

      ;; -- Loan ID -----------------------------------------------------------
      ;; Monotonically incrementing nonce gives each position a unique key.
      ;; Also serves as an implicit anti-replay index for position lookups.
      (new-nonce         (+ (var-get loan-nonce) u1))
    )

    ;; -- Step 7: LOCK - Transfer sBTC collateral from agent into vault --------
    ;; persist oracle observation so read-only quote paths stay warm
    (cache-sbtc-price sbtc-price sbtc-price-ts)
    ;; The SIP-010 transfer call moves exactly collateral-sbtc satoshis from
    ;; tx-sender (the agent) to current-contract (this vault). The Stacks
    ;; protocol enforces this matches the SDK-level post-condition before
    ;; the contract is invoked. If the sBTC transfer fails for any reason
    ;; (insufficient balance, SIP-010 rejection), the whole tx reverts.
    (unwrap!
      (transfer-sbtc-in collateral-sbtc borrower)
      ERR-TRANSFER-FAILED)

    ;; -- Step 8: PAY - Transfer net USDCx from vault to merchant --------------
    ;; The vault sends net-payment micro-USDCx directly to merchant-address.
    ;; This is the API payment that unlocks the origin response. If this
    ;; transfer fails (vault has insufficient USDCx despite the liquidity
    ;; check -- e.g., concurrent race), the sBTC transfer above also reverts
    ;; because Clarity rolls back all state on any (err ...) unwrap failure.
    ;; The SDK post-condition asserts this exact amount reaches the merchant.
    (unwrap!
      (transfer-usdcx-out net-payment merchant-address)
      ERR-TRANSFER-FAILED)

    ;; -- Step 9: Update global accounting -------------------------------------
    ;; Only reached if BOTH transfers succeeded. Global counters are updated
    ;; after transfers so any revert leaves them consistent.
    (var-set total-borrowed         (+ (var-get total-borrowed) amount-usdcx))
    (var-set total-collateral-locked (+ (var-get total-collateral-locked) collateral-sbtc))
    (var-set protocol-fee-reserve   (+ (var-get protocol-fee-reserve) protocol-fee))
    (var-set loan-nonce             new-nonce)

    ;; -- Step 10: Record borrow position --------------------------------------
    ;; borrow-index snapshot ties this position to the current interest index.
    ;; compute-debt uses this snapshot for proportional interest accrual:
    ;;   outstanding_debt = principal * (current_index / borrow_index)
    (map-set borrow-positions
      { borrower: borrower, loan-id: new-nonce }
      {
        collateral-sbtc  : collateral-sbtc,
        principal-usdcx  : amount-usdcx,
        borrow-index     : (var-get global-interest-index),
        origination-time : now,
        merchant-address : merchant-address,
        is-active        : true
      }
    )
    ;; O(1) active-loan lookups by borrower and by loan-id (for liquidation).
    (map-set borrower-active-loan borrower new-nonce)
    (map-set active-loan-borrower new-nonce borrower)

    ;; -- Step 11: Structured event emission -----------------------------------
    ;; Indexed by off-chain listeners (Hiro Explorer, Lend402 dashboard).
    ;; min-sbtc-required is emitted so observers can verify the ratio held.
    (print {
      event              : "borrow-and-pay",
      loan-id            : new-nonce,
      borrower           : borrower,
      merchant           : merchant-address,
      amount-usdcx       : amount-usdcx,
      net-payment        : net-payment,
      protocol-fee       : protocol-fee,
      collateral-sbtc    : collateral-sbtc,
      sbtc-price-usd8    : sbtc-price,
      usdcx-price-usd8   : usdcx-price,
      min-sbtc-required  : min-sbtc-required,
      interest-index     : (var-get global-interest-index),
      block-time         : now
    })

    (ok {
      loan-id          : new-nonce,
      amount-borrowed  : amount-usdcx,
      net-payment      : net-payment,
      collateral-locked: collateral-sbtc,
      origination-time : now
    })
  )
)

;; ---------------------------------------------------------------------------
;; SECTION 13: REPAYMENT
;; ---------------------------------------------------------------------------

;; Agent repays their outstanding debt.
;; Releases proportional sBTC collateral on full repayment.
;;
;; @param loan-id         Unique loan identifier (from borrow-and-pay response)
;; @param repay-usdcx     USDCx amount to repay (may be partial)
(define-public (repay-loan (loan-id uint) (repay-usdcx uint))
  (let
    (
      (accrued-interest (accrue-interest))
      (borrower       tx-sender)
      (active-loan-id (unwrap! (map-get? borrower-active-loan borrower) ERR-POSITION-NOT-FOUND))
      (guard-loan-id  (asserts! (is-eq loan-id active-loan-id) ERR-POSITION-NOT-FOUND))
      (position       (unwrap! (map-get? borrow-positions { borrower: borrower, loan-id: active-loan-id })
                               ERR-POSITION-NOT-FOUND))
      (guard-active (asserts! (get is-active position)       ERR-POSITION-NOT-FOUND))
      (guard-paused (asserts! (not (var-get vault-paused))   ERR-PAUSED))
      (guard-amount (asserts! (> repay-usdcx u0)             ERR-INVALID-AMOUNT))

      (principal    (get principal-usdcx position))
      (b-index      (get borrow-index    position))
      (collateral   (get collateral-sbtc position))

      ;; Outstanding debt including accrued interest
      (total-debt   (compute-debt principal b-index))
      (guard-debt   (asserts! (<= repay-usdcx total-debt) ERR-REPAY-EXCEEDS-DEBT))

      (is-full-repay (is-eq repay-usdcx total-debt))
      (now           stacks-block-time)
    )

    ;; Pull USDCx repayment from borrower
    (unwrap! (transfer-usdcx-in repay-usdcx borrower) ERR-TRANSFER-FAILED)

    (if is-full-repay
      (begin
        ;; Full repayment: release all collateral, close position
        (unwrap! (transfer-sbtc-out collateral borrower) ERR-TRANSFER-FAILED)
        (map-set borrow-positions { borrower: borrower, loan-id: active-loan-id }
          (merge position { is-active: false })
        )
        (map-delete borrower-active-loan borrower)
        (map-delete active-loan-borrower active-loan-id)
        (var-set total-borrowed          (- (var-get total-borrowed) principal))
        (var-set total-collateral-locked (- (var-get total-collateral-locked) collateral))
      )
      ;; Partial repayment: reduce principal, keep position open
      (map-set borrow-positions { borrower: borrower, loan-id: active-loan-id }
        (merge position {
          principal-usdcx : (- total-debt repay-usdcx),
          borrow-index    : (var-get global-interest-index)
        })
      )
    )

    (print {
      event        : "repay-loan",
      loan-id      : loan-id,
      borrower     : borrower,
      repaid       : repay-usdcx,
      is-full      : is-full-repay,
      timestamp    : now
    })
    (ok { repaid: repay-usdcx, is-closed: is-full-repay })
  )
)

;; ---------------------------------------------------------------------------
;; SECTION 14: LIQUIDATION
;; ---------------------------------------------------------------------------

;; Liquidate an undercollateralized position.
;; Callable by any address (permissionless liquidation for market efficiency).
;;
;; Liquidator provides the outstanding USDCx debt and receives:
;;   - collateral-sbtc proportional to repaid debt
;;   - plus LIQUIDATION-BONUS-BPS bonus (5%) from the collateral
;;
;; @param borrower   Address of the under-collateralized agent
;; @param loan-id    Loan identifier to liquidate
(define-public (liquidate (borrower principal) (loan-id uint))
  (let
    (
      (accrued-interest (accrue-interest))
      (liquidator       tx-sender)
      (stored-borrower  (unwrap! (map-get? active-loan-borrower loan-id) ERR-POSITION-NOT-FOUND))
      (guard-borrower   (asserts! (is-eq borrower stored-borrower) ERR-POSITION-NOT-FOUND))
      (active-loan-id   (unwrap! (map-get? borrower-active-loan stored-borrower) ERR-POSITION-NOT-FOUND))
      (guard-loan-id    (asserts! (is-eq loan-id active-loan-id) ERR-POSITION-NOT-FOUND))
      (position         (unwrap! (map-get? borrow-positions { borrower: stored-borrower, loan-id: active-loan-id })
                                 ERR-POSITION-NOT-FOUND))
      (guard-active     (asserts! (get is-active position)       ERR-POSITION-NOT-FOUND))
      (guard-paused     (asserts! (not (var-get vault-paused))   ERR-PAUSED))

      (principal      (get principal-usdcx position))
      (b-index        (get borrow-index    position))
      (collateral     (get collateral-sbtc position))
      (total-debt     (compute-debt principal b-index))

      ;; Oracle prices for health check
      (sbtc-price-data  (unwrap! (fetch-live-sbtc-price) ERR-ORACLE-FAILURE))
      (sbtc-price       (get price sbtc-price-data))
      (sbtc-price-ts    (get timestamp sbtc-price-data))
      (usdcx-price      USDCX-PRICE-USD8)

      ;; Position MUST be below liquidation threshold to be eligible
      (guard-health (asserts!
                      (not (is-position-healthy
                              collateral total-debt sbtc-price usdcx-price LIQUIDATION-RATIO-BPS))
                      ERR-POSITION-HEALTHY))

      ;; Liquidator receives: collateral * (1 + bonus_bps / 10000)
      ;; Capped at full collateral to prevent over-payment
      (bonus-sbtc     (bps-of collateral LIQUIDATION-BONUS-BPS))
      (sbtc-to-liquidator (if (> (+ collateral bonus-sbtc) collateral)
                            collateral  ;; cap at full collateral
                            (+ collateral bonus-sbtc)))
      (now            stacks-block-time)
    )

    ;; Liquidator repays full outstanding debt
    (cache-sbtc-price sbtc-price sbtc-price-ts)
    (unwrap! (transfer-usdcx-in total-debt liquidator) ERR-TRANSFER-FAILED)

    ;; Liquidator receives collateral + bonus
    (unwrap! (transfer-sbtc-out sbtc-to-liquidator liquidator) ERR-TRANSFER-FAILED)

    ;; Close position
    (map-set borrow-positions { borrower: stored-borrower, loan-id: active-loan-id }
      (merge position { is-active: false })
    )
    (map-delete borrower-active-loan stored-borrower)
    (map-delete active-loan-borrower active-loan-id)
    (var-set total-borrowed          (- (var-get total-borrowed) principal))
    (var-set total-collateral-locked (- (var-get total-collateral-locked) collateral))

    (print {
      event             : "liquidation",
      loan-id           : active-loan-id,
      borrower          : stored-borrower,
      liquidator        : liquidator,
      debt-repaid       : total-debt,
      sbtc-released     : sbtc-to-liquidator,
      timestamp         : now
    })
    (ok { debt-repaid: total-debt, collateral-seized: sbtc-to-liquidator })
  )
)

;; ---------------------------------------------------------------------------
;; SECTION 15: READ-ONLY VIEWS
;; ---------------------------------------------------------------------------

;; Get full vault metrics for the Agent Command Center dashboard.
(define-read-only (get-vault-stats)
  {
    total-lp-deposits      : (var-get total-lp-deposits),
    total-borrowed         : (var-get total-borrowed),
    total-collateral-locked: (var-get total-collateral-locked),
    protocol-fee-reserve   : (var-get protocol-fee-reserve),
    global-interest-index  : (var-get global-interest-index),
    last-accrual-time      : (var-get last-accrual-time),
    cached-sbtc-price      : (var-get cached-sbtc-price),
    cached-sbtc-updated-at : (var-get cached-sbtc-price-updated-at),
    loan-nonce             : (var-get loan-nonce),
    is-paused              : (var-get vault-paused),
    free-liquidity         : (- (var-get total-lp-deposits) (var-get total-borrowed))
  }
)

;; Get a specific borrow position (with live debt calculation).
(define-read-only (get-position (borrower principal) (loan-id uint))
  (match (map-get? borrow-positions { borrower: borrower, loan-id: loan-id })
    pos (ok (merge pos {
               current-debt: (compute-debt
                               (get principal-usdcx pos)
                               (get borrow-index    pos))
             }))
    ERR-POSITION-NOT-FOUND
  )
)

;; Convenience: get the active loan for an agent.
(define-read-only (get-active-position (borrower principal))
  (match (map-get? borrower-active-loan borrower)
    loan-id (get-position borrower loan-id)
    ERR-POSITION-NOT-FOUND
  )
)

;; Get LP deposit with accrued yield estimate.
(define-read-only (get-lp-balance (depositor principal))
  (match (map-get? lp-deposits depositor)
    dep (ok {
          deposited-usdcx : (get deposited-usdcx dep),
          deposit-index   : (get deposit-index   dep),
          deposit-time    : (get deposit-time    dep),
          accrued-balance : (fp-mul
                              (get deposited-usdcx dep)
                              (fp-div (var-get global-interest-index) (get deposit-index dep)))
        })
    ERR-LP-NO-DEPOSIT
  )
)

;; Check current health factor of a position (scaled by PRECISION).
;; health_factor = collateral_value / (debt * LIQUIDATION_RATIO / 10000)
;; >= PRECISION means healthy; < PRECISION means liquidatable.
(define-read-only (get-health-factor (borrower principal) (loan-id uint))
  (match (map-get? borrow-positions { borrower: borrower, loan-id: loan-id })
    pos
      (match (get-validated-cached-sbtc-price)
        sbtc-price
          (let
            (
              (debt          (compute-debt (get principal-usdcx pos) (get borrow-index pos)))
              (col-val       (sbtc-to-usdcx-value
                                (get collateral-sbtc pos)
                                sbtc-price
                                USDCX-PRICE-USD8))
              (liquidation-threshold (bps-of debt LIQUIDATION-RATIO-BPS))
            )
            (if (is-eq liquidation-threshold u0)
              (ok PRECISION)
              (ok (fp-div col-val liquidation-threshold))
            )
          )
        oracle-error ERR-ORACLE-FAILURE
      )
    ERR-POSITION-NOT-FOUND
  )
)

;; Simulate a borrow-and-pay to return required collateral & fees before execution.
(define-read-only (simulate-borrow
    (amount-usdcx uint))
  (match (get-validated-cached-sbtc-price)
    sbtc-price
      (let
        (
          (usdcx-price USDCX-PRICE-USD8)
          (min-sbtc    (min-collateral-for-borrow amount-usdcx sbtc-price usdcx-price))
          (fee         (bps-of amount-usdcx PROTOCOL-FEE-BPS))
          (net-pay     (- amount-usdcx fee))
        )
        (ok {
          required-collateral-sbtc : min-sbtc,
          origination-fee-usdcx    : fee,
          net-payment-usdcx        : net-pay,
          sbtc-price-usd8          : sbtc-price,
          usdcx-price-usd8         : usdcx-price,
          collateral-ratio-bps     : COLLATERAL-RATIO-BPS
        })
      )
    oracle-error ERR-ORACLE-FAILURE
  )
)
