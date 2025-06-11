const initialStakeInput = document.getElementById('initial-stake');
const payoutPercentageInput = document.getElementById('payout-percentage');
const maxGalesInput = document.getElementById('max-gales');
const entryDelayInput = document.getElementById('entry-delay');
const accountTypeInputs = document.querySelectorAll('input[name="account-type"]');
const signalsListTextarea = document.getElementById('signals-list');
const simulateBtn = document.getElementById('simulate-btn');
const simulationResultsDiv = document.getElementById('simulation-results');

// Existing elements for bottom summary (keeping for now)
const totalInvestedSpan = document.getElementById('total-invested');
const netProfitSpan = document.getElementById('net-profit');
const currentBalanceSpan = document.getElementById('current-balance'); // Bottom summary balance

const galeStakesDiv = document.getElementById('gale-stakes');

// Elements for the updated top summary display
const initialBalanceDisplayDiv = document.getElementById('initial-balance-display'); // Container
const fixedInitialBalanceValueSpan = document.getElementById('fixed-initial-balance-value'); // Already exists
const currentBalanceDisplaySpan = document.getElementById('current-balance-display'); // New top balance
const netProfitDisplaySpan = document.getElementById('net-profit-display'); // New top profit
const executedCountDisplaySpan = document.getElementById('executed-count-display'); // New executed count
const winCountDisplaySpan = document.getElementById('win-count-display'); // New win count
const lossCountDisplaySpan = document.getElementById('loss-count-display'); // New loss count

// Define the fixed initial balance value
const fixedInitialBalance = 152.00; // You can change this value

// Display the fixed initial balance on load
fixedInitialBalanceValueSpan.textContent = fixedInitialBalance.toFixed(2);
// Initialize the new top summary spans
currentBalanceDisplaySpan.textContent = fixedInitialBalance.toFixed(2);
netProfitDisplaySpan.textContent = (0.00).toFixed(2);
executedCountDisplaySpan.textContent = '0';
winCountDisplaySpan.textContent = '0'; // Will remain 0 without outcome processing
lossCountDisplaySpan.textContent = '0'; // Will remain 0 without outcome processing
netProfitDisplaySpan.classList.remove('profit', 'loss'); // Ensure no initial classes

// Initialize the bottom summary balance display (keeping for now)
currentBalanceSpan.textContent = fixedInitialBalance.toFixed(2);
totalInvestedSpan.textContent = '0.00';
netProfitSpan.textContent = '0.00';
netProfitSpan.classList.remove('profit', 'loss');

simulateBtn.addEventListener('click', simulateMartingale);

// Function to dynamically generate gale stake input fields based on maxGales value
function generateGaleStakeInputs(maxGales) {
    galeStakesDiv.innerHTML = ''; // Clear existing inputs

    // Added isNaN check for robustness
    if (isNaN(maxGales) || maxGales <= 0) {
        // If max gales is 0 or less, or not a number, no gale stake inputs are needed for subsequent gales
        // The initial stake is handled separately.
        return;
    }

    // Generate inputs for Gale 1 up to maxGales
    for (let i = 1; i <= maxGales; i++) { // Start loop from 1 (Gale 1)
        const inputWrapper = document.createElement('div');
        inputWrapper.classList.add('gale-input-wrapper');

        const label = document.createElement('label');
        label.textContent = `Gale ${i}:`; // Label as Gale 1, Gale 2, etc.
        label.setAttribute('for', `gale-stake-${i}`);

        const input = document.createElement('input');
        input.type = 'number';
        input.id = `gale-stake-${i}`;
        // Suggest a value based on initial stake and a doubling strategy roughly
        // For Gale i (i >= 1), a common suggestion is InitialStake * 2^i
        const initialStake = parseFloat(initialStakeInput.value) || 0;
        // Simple multiplicative suggestion: initialStake * 2 for Gale 1, then previous gale * 2
        // Let's refine: Gale 1 needs to recover initial loss + itself profit.
        // Gale i needs to recover total loss up to Gale i-1 + itself profit.
        // To breakeven or make slight profit, G_i * payout >= sum(losses up to G_i-1) + G_i
        // G_i * (payout - 1) >= sum(losses up to G_i-1)
        // G_i >= sum(losses up to G_i-1) / (payout - 1)
        // Loss up to Gale i-1 is InitialStake + Sum(Gale 1..Gale i-2)
        // Let's just provide a simple doubling suggestion for now, user can adjust.
        // G_1 ~ IS * 2; G_2 ~ G_1 * 2; ... G_i ~ G_{i-1} * 2
        // This isn't mathematically precise for Martingale recovery but is a common *simple* approach.
        // Let's stick to InitialStake * Math.pow(2, i) as a very rough starting point for suggested value.
        const suggestedValue = initialStake * Math.pow(2, i);
        input.value = suggestedValue > 0 ? suggestedValue.toFixed(2) : '0.01'; // Ensure value is at least 0.01
        input.min = '0.01';
        input.step = '0.01';
        input.title = `Stake for Gale ${i}`;

        inputWrapper.appendChild(label);
        inputWrapper.appendChild(input);
        galeStakesDiv.appendChild(inputWrapper);
    }
}

// Initial generation of gale stake inputs on page load
// Ensure this runs after the DOM is ready if script is in head, but here it's at the end of body.
// Using a simple timeout or listening for DOMContentLoaded isn't strictly necessary
// when the script tag is at the end of the body and doesn't depend on *all* resources loading,
// but we can wrap it for maximum safety if needed.
// Let's check if the element exists before calling, though it should.
if (maxGalesInput) { // Basic check if the input element is found
    generateGaleStakeInputs(parseInt(maxGalesInput.value));
} else {
    console.error("Element with id 'max-gales' not found.");
}

// Regenerate gale stake inputs when maxGales changes
if (maxGalesInput) {
    maxGalesInput.addEventListener('change', () => {
        generateGaleStakeInputs(parseInt(maxGalesInput.value));
    });
}

// Regenerate gale stake inputs when initialStake changes (to update suggestions)
if (initialStakeInput && maxGalesInput) { // Need both inputs to exist
    initialStakeInput.addEventListener('change', () => {
        generateGaleStakeInputs(parseInt(maxGalesInput.value)); // Need maxGales value here
    });
}

function simulateMartingale() {
    const initialStake = parseFloat(initialStakeInput.value);
    const payoutPercentage = parseFloat(payoutPercentageInput.value) / 100;
    const initialBalance = fixedInitialBalance;
    const signals = signalsListTextarea.value.trim().split('\n').filter(signal => signal);
    const maxGales = parseInt(maxGalesInput.value);

    if (isNaN(initialStake) || initialStake <= 0) {
        alert("Por favor, insira uma aposta inicial válida (> 0).");
        return;
    }
    if (isNaN(payoutPercentage) || payoutPercentage <= 0 || payoutPercentage > 1) {
        alert("Por favor, insira um payout válido (entre 1 e 100).");
        return;
    }
    if (isNaN(maxGales) || maxGales < 0 || maxGales > 10) {
        alert("Por favor, insira um número máximo de gales válido (entre 0 e 10).");
        return;
    }
    // No need to validate initialBalance as it's fixed

    if (signals.length === 0) {
        simulationResultsDiv.innerHTML = "<p>Por favor, insira pelo menos um sinal.</p>";
        // Reset summary areas
        totalInvestedSpan.textContent = '0.00'; // Bottom summary
        netProfitSpan.textContent = '0.00'; // Bottom summary
        currentBalanceSpan.textContent = initialBalance.toFixed(2); // Bottom summary
        netProfitSpan.classList.remove('profit', 'loss');

        currentBalanceDisplaySpan.textContent = initialBalance.toFixed(2); // Top summary
        netProfitDisplaySpan.textContent = (0.00).toFixed(2); // Top summary
        executedCountDisplaySpan.textContent = '0'; // Top summary
        winCountDisplaySpan.textContent = '0'; // Top summary
        lossCountDisplaySpan.textContent = '0'; // Top summary
        netProfitDisplaySpan.classList.remove('profit', 'loss');

        return;
    }

    simulationResultsDiv.innerHTML = ''; // Clear previous results

    // Initialize state variables for the simulation loop
    let currentGaleLevel = 0;
    let currentCumulativeLoss = 0;
    let currentBalance = fixedInitialBalance;

    // Initialize counter variables for the top summary stats
    let executedCount = 0;
    let winCount = 0; // Will remain 0 without outcome processing
    let lossCount = 0; // Will remain 0 without outcome processing
    let totalInvested = 0;

    signals.forEach((signal, index) => {
        const stepDiv = document.createElement('div');
        stepDiv.classList.add('simulation-step');
        stepDiv.dataset.index = index;
        stepDiv.classList.add('pending'); // Start all steps as pending

        // Parse signal string (assuming format "PAIR HH:MM DIRECTION")
        const signalParts = signal.split(' ');
        let pair = 'N/A';
        let time = 'N/A';
        let direction = 'N/A';
        let directionArrow = '';
        let arrowColorClass = '';

        if (signalParts.length >= 3) {
            pair = signalParts[0];
            time = signalParts[1];
            direction = signalParts[2].toUpperCase();

            if (direction === 'CALL') {
                directionArrow = '⬆'; // Up arrow
                arrowColorClass = 'arrow-call'; // Green color
            } else if (direction === 'PUT') {
                directionArrow = '⬇'; // Down arrow
                arrowColorClass = 'arrow-put'; // Red color
            }
        }

        // Use the new HTML structure (removed outcome buttons)
        stepDiv.innerHTML = `
            <div class="step-header">
                <span class="step-index">Sinal ${index + 1}:</span>
                <span class="gale-level-display">(Calculando...)</span>
            </div>
            <div class="trade-details">
                <div class="signal-info">
                    <span class="currency-pair">${pair}</span>
                    <span class="entry-time">${time}</span>
                    <span class="direction-arrow ${arrowColorClass}">${directionArrow}</span>
                </div>
                <div class="trade-values">
                     <p>Aposta: $<span class="stake-value">0.00</span></p>
                </div>
            </div>
            <div class="progress-container">
                <label>Tempo restante:</label>
                <div class="progress-bar-wrapper">
                     <div class="progress-bar"></div> <!-- Static visual bar -->
                     <span class="status-text">EM ANDAMENTO...</span>
                </div>
            </div>
            <p class="step-balance">Banca após este sinal: $<span class="balance-value">Calculando...</span></p>
            <!-- Outcome buttons removed as requested -->
        `;
        simulationResultsDiv.appendChild(stepDiv);
    });

    // Call recalculate after rendering all steps to set initial values and run simulation
    // Since there are no buttons to trigger recalculation from a specific point,
    // the initial calculation effectively determines the final state based on the input parameters.
    // The simulation will show stakes and gale levels, but outcomes are not set via UI.
    // The state will remain 'pending' for all steps unless another mechanism sets win/loss classes.
    // Recalculate from index 0, which will process all steps and update summary.
     recalculateFromIndex(0);
}

function recalculateFromIndex(startIndex) {
    const steps = simulationResultsDiv.children;
    const payoutPercentage = parseFloat(payoutPercentageInput.value) / 100;
    const maxGales = parseInt(maxGalesInput.value);
    const initialStake = parseFloat(initialStakeInput.value) || 0; // Get initial stake

    // Collect gale stakes from generated inputs (for Gale 1 onwards)
    const galeStakes = {}; // Use an object/map for easier lookup by gale number (1-indexed)
    for (let i = 1; i <= maxGales; i++) {
        const input = document.getElementById(`gale-stake-${i}`);
        // Store value, default to 0 if input missing or invalid
        galeStakes[i] = parseFloat(input ? input.value : 0) || 0;
    }

    // Reset state and summary counts if starting from the beginning
    let currentGaleLevel, currentCumulativeLoss, currentBalance;
    let executedCount, winCount, lossCount;
    let totalInvested = 0; // Recalculate total invested from scratch

    if (startIndex === 0) {
         // Initial state for the first step
         currentGaleLevel = 0;
         currentCumulativeLoss = 0;
         currentBalance = fixedInitialBalance;
         executedCount = 0;
         winCount = 0; // Remains 0 without outcome processing
         lossCount = 0; // Remains 0 without outcome processing
         totalInvested = 0; // Start total invested from 0
    } else {
         // Get state from the step *before* the start index
         if (steps[startIndex - 1]) {
              currentGaleLevel = parseInt(steps[startIndex - 1].dataset.galeLevelAfter) || 0;
              currentCumulativeLoss = parseFloat(steps[startIndex - 1].dataset.cumulativeLossAfter) || 0;
              currentBalance = parseFloat(steps[startIndex - 1].dataset.balanceAfter) || fixedInitialBalance;

              // Recalculate counts and total invested UP TO startIndex-1
              executedCount = 0;
              winCount = 0;
              lossCount = 0;
              totalInvested = 0;

               for (let i = 0; i < startIndex; i++) {
                    const step = steps[i];
                    const stake = parseFloat(step.dataset.stake) || 0;
                    // Count executed signals up to this point
                    if (parseInt(step.dataset.galeLevelBefore) === 0 && stake > 0 && !step.classList.contains('untradeable')) {
                         executedCount++;
                    }
                    // Count wins/losses (will be 0 with current setup)
                    if (step.classList.contains('win')) {
                         winCount++;
                    } else if (step.classList.contains('loss')) {
                         lossCount++;
                    }
                    // Sum invested (only if trade was possible/intended)
                    if (stake > 0 && !step.classList.contains('untradeable')) {
                         totalInvested += stake;
                    }
               }

         } else {
              // Should not happen if startIndex > 0 but previous step doesn't exist
              console.error(`Previous step element at index ${startIndex - 1} not found.`);
              currentGaleLevel = 0;
              currentCumulativeLoss = 0;
              currentBalance = fixedInitialBalance;
              executedCount = 0;
              winCount = 0;
              lossCount = 0;
              totalInvested = 0;
         }
    }

    // Loop through steps starting from the one being recalculated
    for (let i = startIndex; i < steps.length; i++) {
        const stepElement = steps[i];
        const stakeValueSpan = stepElement.querySelector('.stake-value');
        const galeLevelDisplaySpan = stepElement.querySelector('.gale-level-display');
        const balanceValueSpan = stepElement.querySelector('.balance-value');
        const statusSpan = stepElement.querySelector('.status-text'); // New status text element

        // State *before* this step: currentGaleLevel, currentCumulativeLoss, currentBalance
        stepElement.dataset.galeLevelBefore = currentGaleLevel;
        stepElement.dataset.cumulativeLossBefore = currentCumulativeLoss.toFixed(2);
        stepElement.dataset.balanceBefore = currentBalance.toFixed(2);

        // Determine stake and if it's tradeable based on state *before* this step
        let currentStake;
        let isLimitExceeded = false; // True if gale limit reached *before* attempting this step

        if (currentGaleLevel === 0) {
             currentStake = initialStake; // Use initial stake for the first entry in a sequence
        } else if (currentGaleLevel > 0 && currentGaleLevel <= maxGales) {
             // Use the stake value defined for this specific gale level (Gale 1, Gale 2, ...)
             currentStake = galeStakes[currentGaleLevel];
        } else {
             // Gale level exceeds maxGales before attempting this trade
             currentStake = 0;
             isLimitExceeded = true;
        }

        // If the determined stake is invalid or zero, treat it as untradeable for this step
        if (isNaN(currentStake) || currentStake <= 0) {
             currentStake = 0; // Ensure stake is 0
             if (!isLimitExceeded) { // Only set flag if not already set by gale limit
                  isLimitExceeded = true;
             }
         }

        stepElement.dataset.stake = currentStake.toFixed(2); // Store the determined stake

        // Determine outcome (Win, Loss, Pending) for *this* step
        // With buttons removed, steps remain 'pending' unless some other code sets the class.
        // Assuming they remain pending for this logic loop.
        let isLoss = stepElement.classList.contains('loss'); // Will be false with current setup
        let isWin = stepElement.classList.contains('win');   // Will be false with current setup
        let isPending = !isLoss && !isWin; // Will be true with current setup

        // --- Update UI elements based on state *before* and *determined outcome* ---

        // Update stake display
        stakeValueSpan.textContent = currentStake.toFixed(2);

        // Update gale level display and tradeability status classes
        stepElement.classList.remove('new-sequence', 'untradeable'); // Remove previous state classes

        if (isLimitExceeded || currentStake <= 0) {
            // If gale limit was exceeded *before* this step, or stake is invalid/zero
            galeLevelDisplaySpan.textContent = `(NÃO REALIZADO)`; // Indicate it didn't happen
            stepElement.classList.add('untradeable');
            // Hide progress bar
            stepElement.querySelector('.progress-container').style.display = 'none';
        } else {
            // Trade is possible for this step
            if (currentGaleLevel === 0) {
                galeLevelDisplaySpan.textContent = `(Entrada Inicial)`; // Label Gale 0 as Initial Entry
                 // Add new-sequence class if it's the start of a sequence AND not the very first signal
                 // A new sequence starts if the current step is Gale 0 AND the previous step wasn't also Gale 0
                 // Check previous step's AFTER state to see what the gale level *was* starting the current step
                 if (i > 0 && steps[i-1] && (parseInt(steps[i-1].dataset.galeLevelAfter) || 0) !== 0) {
                      stepElement.classList.add('new-sequence');
                 } else {
                     stepElement.classList.remove('new-sequence'); // First step is never a "new" sequence start, nor is a repeated Gale 0 after untradeable
                 }
            } else {
                galeLevelDisplaySpan.textContent = `(Gale ${currentGaleLevel})`; // Label Gale 1, 2, etc.
                stepElement.classList.remove('new-sequence'); // Gales > 0 are not new sequence starts
            }
            stepElement.classList.remove('untradeable'); // Ensure untradeable class is removed
            // Show progress bar
             stepElement.querySelector('.progress-container').style.display = ''; // Restore default display
        }

        // Update status display and button states
         // Since buttons are removed, outcome setting is disabled via UI.
         // Steps remain pending unless win/loss classes are added programmatically elsewhere.
         // As per current state after button removal, they always stay pending.
         statusSpan.textContent = "EM ANDAMENTO...";
         stepElement.classList.add('pending');
         // Ensure win/loss classes are removed if stuck in pending
         stepElement.classList.remove('win', 'loss');

        // --- Calculate profit/loss and update balance for *this* step ---
        // Profit/Loss calculation is SKIPPED because isPending is always true due to button removal.
        // If an external mechanism were to set .win or .loss classes, this block *would* execute.
        // For now, balance remains unchanged.
        let balanceAfterStep = currentBalance; // Balance after this step is the same as before if pending

        // Update counts and total invested based on the current step's outcome/state
        // Count executed signals here (when the first attempt for a signal sequence is made)
        // Check if this step *starts* a new sequence (gale level before was 0)
        if (parseInt(stepElement.dataset.galeLevelBefore) === 0) {
             // This is the first attempt for this signal.
             // If a trade was attempted (stake > 0 and not untradeable), count as executed.
            if (currentStake > 0 && !stepElement.classList.contains('untradeable')) {
                executedCount++;
            }
        }

        // Count wins/losses (these will be 0 with current setup)
        if (isWin) {
            winCount++;
        } else if (isLoss) {
            lossCount++;
        }

        // Add stake to total invested if a trade was possible/intended
        if (currentStake > 0 && !stepElement.classList.contains('untradeable')) {
            totalInvested += currentStake;
        }

        balanceValueSpan.textContent = balanceAfterStep.toFixed(2); // Always show balance after considering this step (which is unchanged if pending)

        // --- Update state (gale level, cumulative loss) for the *NEXT* step based on this step's outcome ---
        // Because outcome is always pending, state carries over unless untradeable.
        let nextGaleLevel;
        let nextCumulativeLoss;

        if (stepElement.classList.contains('untradeable')) {
             // If untradeable (limit exceeded or 0 stake), the sequence resets for the *next* step.
             nextGaleLevel = 0;
             nextCumulativeLoss = 0;
             // Balance also stays the same as untradeable step didn't affect it
             // balanceAfterStep is already currentBalance, so just carry it over.
        } else {
            // If the step was tradeable, the state (gale level, cumulative loss) carries over
            // because no outcome is set to reset/advance it based on win/loss.
            // The balance also carries over because profit/loss calculation is skipped.
            nextGaleLevel = currentGaleLevel; // State for next step is the same as before this one
            nextCumulativeLoss = currentCumulativeLoss; // State for next step is the same as before this one
            // balanceAfterStep is already currentBalance, so just carry it over.
        }

        // Apply the calculated next state for the loop iteration
        currentGaleLevel = nextGaleLevel;
        currentCumulativeLoss = nextCumulativeLoss;
        currentBalance = balanceAfterStep; // Carry the balance forward to the next step calculation

        // Store the state *after* this step for use by subsequent recalculations
        stepElement.dataset.galeLevelAfter = currentGaleLevel;
        stepElement.dataset.cumulativeLossAfter = currentCumulativeLoss.toFixed(2);
        stepElement.dataset.balanceAfter = currentBalance.toFixed(2);
    }

    // --- Final update of summary areas ---

    // Update bottom summary (keeping for now)
    totalInvestedSpan.textContent = totalInvested.toFixed(2);
    const totalProfit = currentBalance - fixedInitialBalance; // Calculate total profit from final balance vs initial
    netProfitSpan.textContent = totalProfit.toFixed(2);
    currentBalanceSpan.textContent = currentBalance.toFixed(2); // This holds the final simulation balance

    netProfitSpan.classList.remove('profit', 'loss');
    if (totalProfit > 0) {
        netProfitSpan.classList.add('profit');
    } else if (totalProfit < 0) {
        netProfitSpan.classList.add('loss');
    }
     if (totalProfit === 0) {
         netProfitSpan.classList.remove('profit', 'loss');
     }

    // Update NEW top summary area
    currentBalanceDisplaySpan.textContent = currentBalance.toFixed(2);
    netProfitDisplaySpan.textContent = totalProfit.toFixed(2);
    executedCountDisplaySpan.textContent = executedCount.toString();
    winCountDisplaySpan.textContent = winCount.toString(); // Will be 0
    lossCountDisplaySpan.textContent = lossCount.toString(); // Will be 0

    netProfitDisplaySpan.classList.remove('profit', 'loss');
    if (totalProfit > 0) {
        netProfitDisplaySpan.classList.add('profit');
    } else if (totalProfit < 0) {
        netProfitDisplaySpan.classList.add('loss');
    }
     if (totalProfit === 0) {
         netProfitDisplaySpan.classList.remove('profit', 'loss');
     }
}

// Initial summary balance display using the fixed value
// This is done once on script load
currentBalanceSpan.textContent = fixedInitialBalance.toFixed(2); // Bottom
currentBalanceDisplaySpan.textContent = fixedInitialBalance.toFixed(2); // Top
totalInvestedSpan.textContent = '0.00'; // Bottom
netProfitSpan.textContent = '0.00'; // Bottom
executedCountDisplaySpan.textContent = '0'; // Top
winCountDisplaySpan.textContent = '0'; // Top
lossCountDisplaySpan.textContent = '0'; // Top
netProfitSpan.classList.remove('profit', 'loss'); // Bottom
netProfitDisplaySpan.classList.remove('profit', 'loss'); // Top