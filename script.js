const initialStakeInput = document.getElementById('initial-stake');
const payoutPercentageInput = document.getElementById('payout-percentage');
const maxGalesInput = document.getElementById('max-gales');
const entryDelayInput = document.getElementById('entry-delay');
const accountTypeInputs = document.querySelectorAll('input[name="account-type"]');
const signalsListTextarea = document.getElementById('signals-list');
const simulateBtn = document.getElementById('simulate-btn');
const simulationResultsDiv = document.getElementById('simulation-results');
const totalInvestedSpan = document.getElementById('total-invested');
const netProfitSpan = document.getElementById('net-profit');
const currentBalanceSpan = document.getElementById('current-balance'); // This is the simulation balance
const galeStakesDiv = document.getElementById('gale-stakes');

// New element for fixed initial balance display
const initialBalanceDisplayDiv = document.getElementById('initial-balance-display');
const fixedInitialBalanceValueSpan = document.getElementById('fixed-initial-balance-value');

// Define the fixed initial balance value
const fixedInitialBalance = 152.00; // You can change this value

// Display the fixed initial balance on load
fixedInitialBalanceValueSpan.textContent = fixedInitialBalance.toFixed(2);
currentBalanceSpan.textContent = fixedInitialBalance.toFixed(2); // Also set summary initial balance

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
        // Profit needed for Gale i (stake G_i) after winning is G_i * payout - sum(losses before G_i).
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
        totalInvestedSpan.textContent = '0.00';
        netProfitSpan.textContent = '0.00';
        currentBalanceSpan.textContent = initialBalance.toFixed(2); // Reset simulation balance to initial
        netProfitSpan.classList.remove('profit', 'loss');
        return;
    }

    simulationResultsDiv.innerHTML = ''; // Clear previous results

    // Initialize summary and state variables - these are calculated *during* the simulation
    // And reset/recalculated in recalculateFromIndex

    signals.forEach((signal, index) => {
        const stepDiv = document.createElement('div');
        stepDiv.classList.add('simulation-step');
        stepDiv.dataset.index = index;
        stepDiv.classList.add('pending'); // Start all steps as pending

        // These dataset values will be updated in recalculateFromIndex
        // They represent the state *before* this step
        stepDiv.dataset.stake = '0.00'; // Stake used in this step
        stepDiv.dataset.galeLevelBefore = '0'; // Gale level at the start of this step (0 = initial, 1=gale1, etc)
        stepDiv.dataset.cumulativeLossBefore = '0.00'; // Cumulative loss in the sequence before this step
        // Balance before this step is set dynamically in recalculateFromIndex

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

    // Outcome buttons removed, so no event listeners needed for them.
    // simulationResultsDiv.querySelectorAll('.trade-outcome-buttons button').forEach(button => {
    //     button.addEventListener('click', handleTradeResult);
    // });

    // Call recalculate after rendering all steps to set initial values and run simulation
    // Since there are no buttons to trigger recalculation from a specific point,
    // the initial calculation effectively determines the final state based on the input parameters.
    // The simulation will show stakes and gale levels, but outcomes are not set via UI.
    // The state will remain 'pending' for all steps unless another mechanism sets win/loss classes.
     recalculateFromIndex(0); // Recalculate all steps starting from index 0
}

// handleTradeResult function removed as buttons are removed
/*
function handleTradeResult(event) {
    const clickedButton = event.target;
    const stepIndex = parseInt(clickedButton.dataset.index);
    const isWin = clickedButton.classList.contains('win');
    const stepElement = simulationResultsDiv.children[stepIndex];
    const buttons = stepElement.querySelectorAll('.trade-outcome-buttons button');

    // Add/remove result classes for the clicked step
    stepElement.classList.remove('win', 'loss', 'pending');
    if (isWin) {
        stepElement.classList.add('win');
    } else {
        stepElement.classList.add('loss');
    }

    // Disable buttons for this step
    buttons.forEach(btn => btn.disabled = true);

    // Recalculate results starting from the clicked step's index
    recalculateFromIndex(stepIndex);
}
*/


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

    // Reset state for the recalculation loop (state is BEFORE the current step)
    // Start from the state saved in the step *before* the start index, or the initial state if startIndex is 0
    // If startIndex is 0, previous state is initial state.
    // If startIndex > 0, try to get state from the step at index startIndex - 1.
    let currentGaleLevel, currentCumulativeLoss, currentBalance;

    if (startIndex > 0 && steps[startIndex - 1]) {
         currentGaleLevel = parseInt(steps[startIndex - 1].dataset.galeLevelAfter) || 0;
         currentCumulativeLoss = parseFloat(steps[startIndex - 1].dataset.cumulativeLossAfter) || 0;
         currentBalance = parseFloat(steps[startIndex - 1].dataset.balanceAfter) || fixedInitialBalance;
    } else {
         // This is the very first step being recalculated (startIndex = 0)
         currentGaleLevel = 0;
         currentCumulativeLoss = 0;
         currentBalance = fixedInitialBalance;
    }

    let totalInvested = 0; // Recalculate total invested from scratch up to startIndex-1, then continue
    for (let i = 0; i < startIndex; i++) {
         const step = steps[i];
         // Only add invested amount if the trade was actually performed and outcome decided (no longer possible with buttons removed)
         // Since buttons are removed, steps will always be 'pending' after initial render.
         // If we want Total Invested to show potential investment *if* trades happened,
         // we'd add the stake if it wasn't untradeable.
         // Let's assume Total Invested should reflect the sum of stakes in steps that were *intended* to be traded.
         const stake = parseFloat(step.dataset.stake) || 0;
         if (stake > 0 && !step.classList.contains('untradeable')) {
             totalInvested += stake;
         }
    }

    // Loop through steps starting from the one being recalculated
    for (let i = startIndex; i < steps.length; i++) {
        const stepElement = steps[i];
        const stakeValueSpan = stepElement.querySelector('.stake-value');
        const galeLevelDisplaySpan = stepElement.querySelector('.gale-level-display');
        const balanceValueSpan = stepElement.querySelector('.balance-value');
        const statusSpan = stepElement.querySelector('.status-text'); // New status text element
        // Buttons container reference removed

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
        let isLoss = stepElement.classList.contains('loss'); // Will be false
        let isWin = stepElement.classList.contains('win');   // Will be false
        let isPending = !isLoss && !isWin; // Will be true

        // --- Update UI elements based on state *before* and *determined outcome* ---

        // Update stake display
        stakeValueSpan.textContent = currentStake.toFixed(2);

        // Update gale level display and tradeability status classes
        stepElement.classList.remove('new-sequence', 'untradeable'); // Remove previous state classes

        if (isLimitExceeded || currentStake <= 0) {
            // If gale limit was exceeded *before* this step, or stake is invalid/zero
            galeLevelDisplaySpan.textContent = `(NÃO REALIZADO)`; // Indicate it didn't happen
            stepElement.classList.add('untradeable');
            // Buttons container is removed, no need to hide/show
        } else {
            // Trade is possible for this step
            if (currentGaleLevel === 0) {
                galeLevelDisplaySpan.textContent = `(Entrada Inicial)`; // Label Gale 0 as Initial Entry
                 // Add new-sequence class if it's the start of a sequence AND not the very first signal
                 // A new sequence starts if the current step is Gale 0 AND the previous step wasn't also Gale 0
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
        let profitLossForStep = 0;
        let investedInStep = 0;
        let balanceAfterStep = currentBalance; // Start with balance before this step

        // Profit/Loss calculation is SKIPPED because isPending is always true due to button removal.
        // If an external mechanism were to set .win or .loss classes, this block *would* execute.
        /*
        if (!stepElement.classList.contains('untradeable') && !isPending) { // !isPending is always false now
            investedInStep = currentStake;
            totalInvested += investedInStep; // Add to total invested ONLY if the trade happened

            if (isLoss) {
                profitLossForStep = -investedInStep; // Loss is the stake amount
            } else if (isWin) {
                 let returnAmount = investedInStep * payoutPercentage;
                 // Profit is return minus total invested in the entire sequence up to and including THIS step
                 const lossBefore = parseFloat(stepElement.dataset.cumulativeLossBefore) || 0;
                 profitLossForStep = returnAmount - (investedInStep + lossBefore);
            }
             // Apply profit/loss to balance
             balanceAfterStep = currentBalance + profitLossForStep;

        } else if (!isPending && stepElement.classList.contains('untradeable')) { // !isPending is always false now
             // If untradeable (due to limit or invalid stake) and outcome is decided (even though it wasn't a trade)
             // Balance doesn't change, sequence state resets for the next step.
             balanceAfterStep = currentBalance; // Balance remains the same
             // totalInvested does NOT increase for untradeable steps
        }
        */
        // Because the outcome is always pending, balanceAfterStep remains currentBalance
        // And totalInvested is only calculated for *intended* trades, not based on outcome now.
         if (currentStake > 0 && !stepElement.classList.contains('untradeable')) {
             totalInvested += currentStake; // Sum up potential investment if trade was possible
         }

        balanceValueSpan.textContent = balanceAfterStep.toFixed(2); // Always show balance after considering this step (which is unchanged if pending)

        // --- Update state (gale level, cumulative loss) for the *NEXT* step based on this step's outcome ---
        let nextGaleLevel;
        let nextCumulativeLoss;

        // Determine next state ONLY if the outcome for the current step is decided (not pending)
        // Since isPending is always true, the state calculation for the next step also defaults.
        /*
        if (!isPending) { // This condition is always false now
             if (isWin || stepElement.classList.contains('untradeable')) {
                 // Sequence resets for the next step if:
                 // 1. Current trade was a win.
                 // 2. Current step was untradeable (due to limit or invalid stake).
                 nextGaleLevel = 0;
                 nextCumulativeLoss = 0;
             } else if (isLoss && investedInStep > 0) {
                  // If current step was a loss AND a trade actually happened (investedInStep > 0),
                  // increment gale level and add invested stake to sequence loss for the NEXT step
                  nextCumulativeLoss = currentCumulativeLoss + investedInStep; // Add the actual invested amount from this losing step
                  nextGaleLevel = currentGaleLevel + 1;
             } else {
                 // Should not happen if not pending and not win/loss/untradeable/invested > 0
                 // Default to resetting state just in case
                 nextGaleLevel = 0;
                 nextCumulativeLoss = 0;
             }
         } else {
             // If pending, the state for the NEXT step is the same as the state BEFORE the current step.
             nextGaleLevel = currentGaleLevel;
             nextCumulativeLoss = currentCumulativeLoss;
         }
        */

        // Revised state logic: If a step is untradeable (limit exceeded or 0 stake), the sequence resets for the *next* step.
        // Otherwise, the state carries over. Since outcomes aren't set, loss/win logic is skipped.
        if (stepElement.classList.contains('untradeable')) {
             nextGaleLevel = 0;
             nextCumulativeLoss = 0;
             // Balance also stays the same as untradeable step didn't affect it
             balanceAfterStep = currentBalance; // Explicitly carry over balance
        } else {
            // If the step was tradeable, the state (gale level, cumulative loss) carries over
            // because no outcome is set to reset/advance it based on win/loss.
            // The balance also carries over because profit/loss calculation is skipped.
            nextGaleLevel = currentGaleLevel;
            nextCumulativeLoss = currentCumulativeLoss;
            balanceAfterStep = currentBalance; // Explicitly carry over balance
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

    // --- Final update of summary area ---
    totalInvestedSpan.textContent = totalInvested.toFixed(2);
    // The final balance in the simulation is the currentBalance after the loop finishes
    // Since outcomes are not set via UI, balance will always be initialBalance.
    totalProfit = currentBalance - fixedInitialBalance; // Calculate total profit from final balance vs initial
    netProfitSpan.textContent = totalProfit.toFixed(2);
    currentBalanceSpan.textContent = currentBalance.toFixed(2); // This holds the final simulation balance

    netProfitSpan.classList.remove('profit', 'loss');
    if (totalProfit > 0) {
        netProfitSpan.classList.add('profit');
    } else if (totalProfit < 0) {
        netProfitSpan.classList.add('loss');
    }
     // If totalProfit is 0, remove both classes
     if (totalProfit === 0) {
         netProfitSpan.classList.remove('profit', 'loss');
     }

    // Ensure the fixed initial balance display is set on page load (handled outside this function)
}


// Initial summary balance display using the fixed value
// This is done once on script load
currentBalanceSpan.textContent = fixedInitialBalance.toFixed(2);
totalInvestedSpan.textContent = '0.00';
netProfitSpan.textContent = '0.00';
netProfitSpan.classList.remove('profit', 'loss');

// Initial call to generate inputs based on default value
// This was already present, ensuring it runs on load.
// generateGaleStakeInputs(parseInt(maxGalesInput.value)); // Wrapped in if check above now

// The simulateMartingale function is only called on button click.
// The state setup (like setting initial balance in summary) is done on script load.
// The gale inputs are generated on load and on change of relevant fields.
// Everything seems correctly initialized.