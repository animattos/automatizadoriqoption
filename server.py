
import sys
import time
from flask import Flask, request, jsonify
from threading import Timer
import datetime

# Adicionar caminho local da API v3.0
sys.path.append("./iqoptionapi_v3/iqoptionapi-main")

from iqoptionapi.stable_api import IQ_Option

app = Flask(__name__)

EMAIL = "estudioanimattos@gmail.com"
PASSWORD = "Ar160518*"

I_want_money = IQ_Option(EMAIL, PASSWORD)
connected, reason = I_want_money.connect()
time.sleep(3)  # Aguarda WebSocket sincronizar

if connected:
    print("Conectado com sucesso à IQ Option")
else:
    print("Erro ao conectar:", reason)

# Conta de treinamento por padrão
I_want_money.change_balance("practice")

# Endpoint de saldo
@app.route("/saldo", methods=["GET"])
def saldo():
    try:
        saldo = I_want_money.get_balance()
        return jsonify({"saldo": saldo})
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# Função de martingale
def gerar_gales(valor_inicial, payout, tentativas):
    gales = []
    perda_acumulada = valor_inicial
    for _ in range(tentativas):
        valor = round(perda_acumulada / (payout / 100), 2)
        gales.append(valor)
        perda_acumulada += valor
    return [valor_inicial] + gales

def executar_sinal(par, direcao, delay, valor_inicial, payout, max_gales):
    valores = gerar_gales(valor_inicial, payout, max_gales)
    for i, valor in enumerate(valores):
        print(f"Gale {i} - {par} - {direcao} - Valor: {valor}")
        status, id = I_want_money.buy(valor, par, direcao, 1)
        if status:
            print(f"Entrada realizada - ID: {id}")
            while not I_want_money.check_win_v3(id)[0]:
                time.sleep(1)
            resultado = I_want_money.check_win_v3(id)[1]
            if resultado > 0:
                print(f"WIN: +{resultado}")
                break
            else:
                print("LOSS")
        else:
            print("Erro ao operar")
            break

@app.route("/executar-sinais", methods=["POST"])
def receber_sinais():
    data = request.json
    sinais = data.get("sinais", [])
    valor_inicial = float(data.get("valor_inicial", 5))
    payout = float(data.get("payout", 85))
    delay = int(data.get("delay", 5))
    max_gales = int(data.get("max_gales", 4))

    for sinal in sinais:
        try:
            par, hora, direcao = sinal.strip().split()
            h, m = map(int, hora.split(":"))
            agora = datetime.datetime.now()
            exec_time = agora.replace(hour=h, minute=m, second=0, microsecond=0)
            if exec_time < agora:
                exec_time += datetime.timedelta(days=1)
            segundos = (exec_time - agora).total_seconds() - delay
            Timer(segundos, executar_sinal, args=(par, direcao.lower(), delay, valor_inicial, payout, max_gales)).start()
            print(f"Sinal agendado para {exec_time.strftime('%H:%M:%S')} - {par} {direcao}")
        except Exception as e:
            print("Erro ao agendar sinal:", e)

    return jsonify({"status": "Sinais recebidos e agendados com sucesso."})

if __name__ == "__main__":
    app.run(port=5000)
