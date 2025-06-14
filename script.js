
document.addEventListener("DOMContentLoaded", function () {
    atualizarSaldoReal();
    gerarInputsDeGale();
});

async function atualizarSaldoReal() {
    try {
        const response = await fetch("http://localhost:5000/saldo");
        const data = await response.json();
        const saldo = data.saldo.toFixed(2);
        document.getElementById("fixed-initial-balance-value").textContent = saldo;
        document.getElementById("current-balance").textContent = saldo;
    } catch (error) {
        console.error("Erro ao buscar saldo:", error);
    }
}

function gerarInputsDeGale() {
    const maxGales = parseInt(document.getElementById("max-gales").value);
    const valorBase = parseFloat(document.getElementById("initial-stake").value);
    const galeDiv = document.getElementById("gale-stakes");
    galeDiv.innerHTML = "";

    for (let i = 1; i <= maxGales; i++) {
        const wrapper = document.createElement("div");
        wrapper.classList.add("gale-input-wrapper");

        const label = document.createElement("label");
        label.textContent = `Gale ${i}:`;

        const input = document.createElement("input");
        input.type = "number";
        input.min = 0.01;
        input.step = 0.01;
        input.value = (valorBase * Math.pow(2, i)).toFixed(2);

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        galeDiv.appendChild(wrapper);
    }
}

// Eventos para regenerar campos dos gales quando valores mudarem
document.getElementById("max-gales").addEventListener("input", gerarInputsDeGale);
document.getElementById("initial-stake").addEventListener("input", gerarInputsDeGale);
