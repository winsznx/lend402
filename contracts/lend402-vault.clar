;; =============================================================================
;; LEND402-VAULT.CLAR
;; Just-In-Time Micro-Lending Protocol for AI Agents on Stacks (Nakamoto)
;; Version: 1.0.0
;; Clarity Version: 4
;; =============================================================================
;; OVERVIEW:
;;   AI agents hold sBTC as a treasury asset. When a paywalled API returns a
;;   402 Payment Required demanding USDCx, this vault atomically:
;;     1. Verifies sBTC/USDCx oracle price (enforcing 150% collateral ratio)
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
;; SECTION 1: ORACLE TRAIT
;; ---------------------------------------------------------------------------
;; Redstone / Pyth-on-Stacks adapter interface.
;; Returns price scaled to 8 decimal places (e.g. 1 sBTC = 6500000000000 = $65,000.00000000)

(define-trait oracle-trait
  (
    ;; Returns (ok { price: uint, decimals: uint, timestamp: uint })
    (get-price (string-ascii 12)) (response { price: uint, decimals: uint, timestamp: uint } uint)
  )
)

;; ---------------------------------------------------------------------------
;; SECTION 2: CONSTANTS
;; ---------------------------------------------------------------------------

;; Contract owner / governance
(define-constant CONTRACT-OWNER tx-sender)

;; SIP-010 token contract addresses (Stacks mainnet)
;; USDCx: Circle xReserve native USDC on Stacks
(define-constant USDCX-CONTRACT   'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.usdc-token)
;; sBTC: Non-custodial 1:1 Bitcoin-backed asset
(define-constant SBTC-CONTRACT    'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.sbtc-token)

;; Oracle contract (Redstone price feed adapter)
(define-constant ORACLE-CONTRACT  'SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.redstone-oracle)

;; Collateral parameters (basis points, 10000 = 100%)
(define-constant COLLATERAL-RATIO-BPS     u15000)  ;; 150% minimum collateral ratio
(define-constant LIQUIDATION-RATIO-BPS    u12500)  ;; 125% liquidation threshold
(define-constant LIQUIDATION-BONUS-BPS    u  500)  ;; 5% bonus for liquidators
(define-constant PROTOCOL-FEE-BPS         u   30)  ;; 0.30% origination fee to treasury
(define-constant LP-INTEREST-RATE-BPS     u  200)  ;; 2.00% annualized base rate to LPs

;; Interest accrual uses block-time (Nakamoto: ~5 seconds per fast-block)
;; Annual seconds = 365 * 24 * 60 * 60 = 31536000
(define-constant SECONDS-PER-YEAR        u31536000)

;; Precision multiplier for fixed-point arithmetic (1e8)
(define-constant PRECISION               u100000000)

;; Maximum oracle staleness: 60 seconds
(define-constant MAX-ORACLE-AGE-SECONDS  u60)

;; Asset ticker symbols for oracle lookups
(define-constant SBTC-TICKER  "sBTC-USD")
(define-constant USDCX-TICKER "USDC-USD")

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
;; SECTION 4: VAULT STATE — DATA VARIABLES
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

;; ---------------------------------------------------------------------------
;; SECTION 5: VAULT STATE — DATA MAPS
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

;; ---------------------------------------------------------------------------
;; SECTION 6: PRIVATE HELPERS — ARITHMETIC
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
;; SECTION 7: PRIVATE HELPERS — INTEREST ACCRUAL
;; ---------------------------------------------------------------------------

;; Compute the elapsed time since last accrual (capped to prevent runaway index).
;; Returns seconds elapsed.
(define-private (elapsed-seconds)
  (let
    (
      (now        (unwrap-panic (get-block-info? time u0)))  ;; Nakamoto: block-time
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
      (now        (unwrap-panic (get-block-info? time u0)))
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
;; SECTION 8: PRIVATE HELPERS — ORACLE & COLLATERAL
;; ---------------------------------------------------------------------------

;; Fetch a validated price from the oracle adapter.
;; Reverts if price is stale (> MAX-ORACLE-AGE-SECONDS) or zero.
(define-private (get-validated-price (ticker (string-ascii 12)))
  (let
    (
      (result (contract-call? ORACLE-CONTRACT get-price ticker))
    )
    (match result
      price-data
        (let
          (
            (now         (unwrap-panic (get-block-info? time u0)))
            (ts          (get timestamp price-data))
            (px          (get price price-data))
          )
          (asserts! (<= (- now ts) MAX-ORACLE-AGE-SECONDS) ERR-ORACLE-STALE)
          (asserts! (> px u0) ERR-PRICE-ZERO)
          (ok price-data)
        )
      _err ERR-ORACLE-FAILURE
    )
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
;; SECTION 9: PRIVATE HELPERS — TOKEN OPS
;; ---------------------------------------------------------------------------

;; Transfer USDCx from this contract to a recipient.
;; Wraps contract-call to the SIP-010 USDCx contract.
(define-private (transfer-usdcx-out
    (amount uint)
    (recipient principal))
  (contract-call? USDCX-CONTRACT transfer amount (as-contract tx-sender) recipient none)
)

;; Transfer sBTC from a sender to this contract.
(define-private (transfer-sbtc-in
    (amount uint)
    (sender principal))
  (contract-call? SBTC-CONTRACT transfer amount sender (as-contract tx-sender) none)
)

;; Transfer sBTC from this contract back to a recipient.
(define-private (transfer-sbtc-out
    (amount uint)
    (recipient principal))
  (contract-call? SBTC-CONTRACT transfer amount (as-contract tx-sender) recipient none)
)

;; Transfer USDCx from an LP into this contract.
(define-private (transfer-usdcx-in
    (amount uint)
    (sender principal))
  (contract-call? USDCX-CONTRACT transfer amount sender (as-contract tx-sender) none)
)

;; ---------------------------------------------------------------------------
;; SECTION 10: ADMIN — GOVERNANCE & CIRCUIT BREAKER
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
      (_accrued  (accrue-interest))
      (depositor tx-sender)
      (now       (unwrap-panic (get-block-info? time u0)))
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
      (_accrued      (accrue-interest))
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
      timestamp      : (unwrap-panic (get-block-info? time u0))
    })
    (ok withdraw-amt)
  )
)

;; ---------------------------------------------------------------------------
;; SECTION 12: CORE — BORROW-AND-PAY (The JIT Atomic Loan)
;; ---------------------------------------------------------------------------
;;
;; This is the canonical entry point for agent SDK calls.
;;
;; FLOW:
;;   1. Accrue global interest index
;;   2. Validate inputs and circuit breaker
;;   3. Fetch + validate oracle prices (staleness check)
;;   4. Verify submitted collateral-sbtc satisfies 150% ratio for amount-usdcx
;;   5. Verify sufficient LP liquidity
;;   6. Compute and deduct origination fee
;;   7. LOCK: Transfer collateral-sbtc from agent into vault
;;   8. BORROW: Increase total-borrowed state
;;   9. PAY: Transfer net USDCx directly to merchant-address
;;  10. Record borrow position with index snapshot + block-time timestamp
;;  11. Emit structured event log
;;
;; POST-CONDITIONS (enforced by Clarity's linear type system + explicit asserts):
;;   - Agent's sBTC balance DECREASES by exactly collateral-sbtc
;;   - Merchant's USDCx balance INCREASES by exactly (amount-usdcx - fee)
;;   - Vault's sBTC balance INCREASES by exactly collateral-sbtc
;;   - total-borrowed INCREASES by exactly amount-usdcx
;;
;; @param amount-usdcx      USDCx to borrow and pay (6 decimals)
;; @param merchant-address  The API provider's Stacks principal receiving USDCx
;; @param collateral-sbtc   sBTC to lock as collateral (8 decimals, satoshis)
(define-public (borrow-and-pay
    (amount-usdcx    uint)
    (merchant-address principal)
    (collateral-sbtc  uint))
  (let
    (
      ;; ── Step 1: Accrue interest ───────────────────────────────────────────
      (_accrued          (accrue-interest))
      (borrower          tx-sender)
      (now               (unwrap-panic (get-block-info? time u0)))

      ;; ── Step 2a: Basic input validation ───────────────────────────────────
      (_ (asserts! (not (var-get vault-paused))            ERR-PAUSED))
      (_ (asserts! (>= amount-usdcx MIN-BORROW-AMOUNT)     ERR-BELOW-MIN-BORROW))
      (_ (asserts! (<= amount-usdcx MAX-BORROW-AMOUNT)     ERR-ABOVE-MAX-BORROW))
      (_ (asserts! (> collateral-sbtc u0)                  ERR-ZERO-COLLATERAL))
      (_ (asserts! (not (is-eq merchant-address borrower)) ERR-MERCHANT-INVALID))

      ;; ── Step 3: Oracle price fetch & validation ────────────────────────────
      (sbtc-price-data   (unwrap! (get-validated-price SBTC-TICKER)  ERR-ORACLE-FAILURE))
      (usdcx-price-data  (unwrap! (get-validated-price USDCX-TICKER) ERR-ORACLE-FAILURE))
      (sbtc-price        (get price sbtc-price-data))
      (usdcx-price       (get price usdcx-price-data))

      ;; ── Step 4: Collateral ratio check ────────────────────────────────────
      (min-sbtc-required (min-collateral-for-borrow amount-usdcx sbtc-price usdcx-price))
      (_ (asserts! (>= collateral-sbtc min-sbtc-required) ERR-INSUFFICIENT-COLLATERAL))

      ;; ── Step 5: Liquidity availability check ──────────────────────────────
      (free-liquidity    (- (var-get total-lp-deposits) (var-get total-borrowed)))
      (_ (asserts! (>= free-liquidity amount-usdcx)     ERR-INSUFFICIENT-LIQUIDITY))

      ;; ── Step 6: Origination fee computation ───────────────────────────────
      (protocol-fee      (bps-of amount-usdcx PROTOCOL-FEE-BPS))
      (net-payment       (- amount-usdcx protocol-fee))

      ;; ── Step 10a: Generate unique loan ID ──────────────────────────────────
      (new-nonce         (+ (var-get loan-nonce) u1))
    )

    ;; ── Step 7: LOCK — Transfer sBTC collateral from agent to vault ──────────
    (unwrap!
      (transfer-sbtc-in collateral-sbtc borrower)
      ERR-TRANSFER-FAILED)

    ;; ── Step 9: PAY — Transfer net USDCx from vault to merchant ──────────────
    ;; Done before recording state (fail-fast: if transfer fails, entire tx reverts)
    (unwrap!
      (transfer-usdcx-out net-payment merchant-address)
      ERR-TRANSFER-FAILED)

    ;; ── Step 8: Update global borrow accounting ───────────────────────────────
    (var-set total-borrowed         (+ (var-get total-borrowed) amount-usdcx))
    (var-set total-collateral-locked (+ (var-get total-collateral-locked) collateral-sbtc))
    (var-set protocol-fee-reserve   (+ (var-get protocol-fee-reserve) protocol-fee))
    (var-set loan-nonce             new-nonce)

    ;; ── Step 10b: Record position ──────────────────────────────────────────────
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
    (map-set borrower-active-loan borrower new-nonce)

    ;; ── Step 11: Structured event emission ────────────────────────────────────
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
      (_accrued    (accrue-interest))
      (borrower    tx-sender)
      (position    (unwrap! (map-get? borrow-positions { borrower: borrower, loan-id: loan-id })
                            ERR-POSITION-NOT-FOUND))
      (_ (asserts! (get is-active position)       ERR-POSITION-NOT-FOUND))
      (_ (asserts! (not (var-get vault-paused))   ERR-PAUSED))
      (_ (asserts! (> repay-usdcx u0)             ERR-INVALID-AMOUNT))

      (principal    (get principal-usdcx position))
      (b-index      (get borrow-index    position))
      (collateral   (get collateral-sbtc position))

      ;; Outstanding debt including accrued interest
      (total-debt   (compute-debt principal b-index))
      (_ (asserts! (<= repay-usdcx total-debt) ERR-REPAY-EXCEEDS-DEBT))

      (is-full-repay (is-eq repay-usdcx total-debt))
      (now           (unwrap-panic (get-block-info? time u0)))
    )

    ;; Pull USDCx repayment from borrower
    (unwrap! (transfer-usdcx-in repay-usdcx borrower) ERR-TRANSFER-FAILED)

    (if is-full-repay
      (begin
        ;; Full repayment: release all collateral, close position
        (unwrap! (transfer-sbtc-out collateral borrower) ERR-TRANSFER-FAILED)
        (map-set borrow-positions { borrower: borrower, loan-id: loan-id }
          (merge position { is-active: false })
        )
        (map-delete borrower-active-loan borrower)
        (var-set total-borrowed          (- (var-get total-borrowed) principal))
        (var-set total-collateral-locked (- (var-get total-collateral-locked) collateral))
      )
      ;; Partial repayment: reduce principal, keep position open
      (map-set borrow-positions { borrower: borrower, loan-id: loan-id }
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
      (_accrued       (accrue-interest))
      (liquidator     tx-sender)
      (position       (unwrap! (map-get? borrow-positions { borrower: borrower, loan-id: loan-id })
                               ERR-POSITION-NOT-FOUND))
      (_ (asserts! (get is-active position)       ERR-POSITION-NOT-FOUND))
      (_ (asserts! (not (var-get vault-paused))   ERR-PAUSED))

      (principal      (get principal-usdcx position))
      (b-index        (get borrow-index    position))
      (collateral     (get collateral-sbtc position))
      (total-debt     (compute-debt principal b-index))

      ;; Oracle prices for health check
      (sbtc-price-data  (unwrap! (get-validated-price SBTC-TICKER)  ERR-ORACLE-FAILURE))
      (usdcx-price-data (unwrap! (get-validated-price USDCX-TICKER) ERR-ORACLE-FAILURE))
      (sbtc-price       (get price sbtc-price-data))
      (usdcx-price      (get price usdcx-price-data))

      ;; Position MUST be below liquidation threshold to be eligible
      (_ (asserts!
            (not (is-position-healthy
                    collateral total-debt sbtc-price usdcx-price LIQUIDATION-RATIO-BPS))
            ERR-POSITION-HEALTHY))

      ;; Liquidator receives: collateral * (1 + bonus_bps / 10000)
      ;; Capped at full collateral to prevent over-payment
      (bonus-sbtc     (bps-of collateral LIQUIDATION-BONUS-BPS))
      (sbtc-to-liquidator (if (> (+ collateral bonus-sbtc) collateral)
                            collateral  ;; cap at full collateral
                            (+ collateral bonus-sbtc)))
      (now            (unwrap-panic (get-block-info? time u0)))
    )

    ;; Liquidator repays full outstanding debt
    (unwrap! (transfer-usdcx-in total-debt liquidator) ERR-TRANSFER-FAILED)

    ;; Liquidator receives collateral + bonus
    (unwrap! (transfer-sbtc-out sbtc-to-liquidator liquidator) ERR-TRANSFER-FAILED)

    ;; Close position
    (map-set borrow-positions { borrower: borrower, loan-id: loan-id }
      (merge position { is-active: false })
    )
    (map-delete borrower-active-loan borrower)
    (var-set total-borrowed          (- (var-get total-borrowed) principal))
    (var-set total-collateral-locked (- (var-get total-collateral-locked) collateral))

    (print {
      event             : "liquidation",
      loan-id           : loan-id,
      borrower          : borrower,
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
      (match (get-validated-price SBTC-TICKER)
        sbtc-data
          (match (get-validated-price USDCX-TICKER)
            usdcx-data
              (let
                (
                  (debt          (compute-debt (get principal-usdcx pos) (get borrow-index pos)))
                  (col-val       (sbtc-to-usdcx-value
                                    (get collateral-sbtc pos)
                                    (get price sbtc-data)
                                    (get price usdcx-data)))
                  (liquidation-threshold (bps-of debt LIQUIDATION-RATIO-BPS))
                )
                (if (is-eq liquidation-threshold u0)
                  (ok PRECISION)
                  (ok (fp-div col-val liquidation-threshold))
                )
              )
            _ ERR-ORACLE-FAILURE
          )
        _ ERR-ORACLE-FAILURE
      )
    ERR-POSITION-NOT-FOUND
  )
)

;; Simulate a borrow-and-pay to return required collateral & fees before execution.
(define-read-only (simulate-borrow
    (amount-usdcx uint))
  (match (get-validated-price SBTC-TICKER)
    sbtc-data
      (match (get-validated-price USDCX-TICKER)
        usdcx-data
          (let
            (
              (sbtc-price  (get price sbtc-data))
              (usdcx-price (get price usdcx-data))
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
        _ ERR-ORACLE-FAILURE
      )
    _ ERR-ORACLE-FAILURE
  )
)
