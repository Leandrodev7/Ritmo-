"use strict";

const CHAVE_HISTORICO = "ritmo.treinos.v1";
const atividades = {
  corrida: { nome: "Corrida", cor: "verde" },
  caminhada: { nome: "Caminhada", cor: "laranja" },
  ciclismo: { nome: "Ciclismo", cor: "azul" },
};

const botaoTreino = document.getElementById("botao-treino");
const seletorAtividade = document.getElementById("atividade");
const statusTreino = document.getElementById("status-treino");
const statusOffline = document.getElementById("status-offline");
const graficoSemana = document.getElementById("grafico-semana");
const diasSemana = document.getElementById("dias-semana");
const historicoTreinos = document.getElementById("historico-treinos");

let treinos = carregarTreinos();
let inicioTreino = null;
let distanciaMetros = 0;
let ultimaPosicao = null;
let recebeuPosicao = false;
let idObservador = null;
let atualizador = null;
let offlinePreparado = false;

function atualizarAvisoOffline() {
  if (!navigator.onLine) {
    statusOffline.textContent = offlinePreparado
      ? "Sem internet: o app e o histórico continuam disponíveis neste aparelho."
      : "Sem internet e o app ainda não foi preparado para uso offline. Conecte-se e abra-o por HTTPS primeiro.";
    return;
  }
  statusOffline.textContent = offlinePreparado
    ? "App pronto para uso offline neste aparelho."
    : "Abra por HTTPS e aguarde a preparação offline; depois, adicione o app à tela inicial.";
}

function prepararUsoOffline() {
  if (location.protocol === "file:" || !("serviceWorker" in navigator)) {
    atualizarAvisoOffline();
    return;
  }

  navigator.serviceWorker
    .register("./service-worker.js")
    .then((registro) => {
      const trabalhador = registro.installing || registro.waiting || registro.active;
      if (!trabalhador) {
        throw new Error("O navegador não iniciou o service worker.");
      }

      const atualizarEstado = () => {
        if (trabalhador.state === "activated") {
          offlinePreparado = true;
          atualizarAvisoOffline();
        } else if (trabalhador.state === "redundant") {
          const erro = new Error("O service worker offline não foi ativado.");
          console.error("Não foi possível preparar o app para uso offline.", erro);
          statusOffline.textContent =
            "Não foi possível preparar o modo offline. Abra o app por HTTPS e tente novamente.";
        }
      };

      atualizarEstado();
      trabalhador.addEventListener("statechange", atualizarEstado);
    })
    .catch((erro) => {
      console.error("Não foi possível preparar o app para uso offline.", erro);
      statusOffline.textContent =
        "Não foi possível preparar o modo offline. Abra o app por HTTPS e tente novamente.";
    });
}

function treinoValido(treino) {
  return (
    treino !== null &&
    typeof treino === "object" &&
    Object.prototype.hasOwnProperty.call(atividades, treino.atividade) &&
    Number.isFinite(treino.inicio) &&
    Number.isFinite(treino.duracaoMs) &&
    treino.duracaoMs >= 0 &&
    Number.isFinite(treino.distanciaKm) &&
    treino.distanciaKm >= 0
  );
}

function carregarTreinos() {
  try {
    const salvo = localStorage.getItem(CHAVE_HISTORICO);
    if (salvo === null) {
      return [];
    }

    const dados = JSON.parse(salvo);
    if (!Array.isArray(dados) || !dados.every(treinoValido)) {
      throw new Error("O histórico salvo não tem o formato esperado.");
    }
    return dados;
  } catch (erro) {
    console.error("Não foi possível carregar o histórico de treinos.", erro);
    botaoTreino.disabled = true;
    mostrarStatus(
      "Não foi possível ler o histórico salvo neste aparelho. Verifique o armazenamento do navegador e recarregue a página.",
      true,
    );
    return [];
  }
}

function salvarTreinos() {
  try {
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(treinos));
    return true;
  } catch (erro) {
    console.error("Não foi possível salvar o histórico de treinos.", erro);
    return false;
  }
}

function formatarDistancia(distanciaKm) {
  return `${distanciaKm.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} km`;
}

function formatarDuracao(duracaoMs) {
  const totalSegundos = Math.floor(duracaoMs / 1000);
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;

  if (horas > 0) {
    return `${horas}h ${String(minutos).padStart(2, "0")}min`;
  }
  if (minutos > 0) {
    return `${minutos}min ${String(segundos).padStart(2, "0")}s`;
  }
  return `${segundos}s`;
}

function mostrarStatus(mensagem, erro = false) {
  statusTreino.hidden = false;
  statusTreino.classList.toggle("erro", erro);
  statusTreino.textContent = mensagem;
}

function inicioDaSemana(data) {
  const inicio = new Date(data);
  inicio.setHours(0, 0, 0, 0);
  inicio.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7));
  return inicio;
}

function atualizarPainel() {
  const agora = new Date();
  const segunda = inicioDaSemana(agora);
  const treinosDaSemana = treinos.filter((treino) => treino.inicio >= segunda.getTime());
  const distanciaSemana = treinosDaSemana.reduce(
    (total, treino) => total + treino.distanciaKm,
    0,
  );
  const tempoSemana = treinosDaSemana.reduce(
    (total, treino) => total + treino.duracaoMs,
    0,
  );

  document.getElementById("distancia-semana").textContent =
    formatarDistancia(distanciaSemana);
  document.getElementById("tempo-semana").textContent = formatarDuracaoTotal(tempoSemana);
  document.getElementById("quantidade-semana").textContent =
    String(treinosDaSemana.length);

  atualizarGrafico(segunda, treinosDaSemana);
  atualizarRecorde("corrida", "recorde-corrida", "detalhe-corrida");
  atualizarRecorde("ciclismo", "recorde-ciclismo", "detalhe-ciclismo");
  atualizarHistorico();
}

function formatarDuracaoTotal(duracaoMs) {
  const minutosTotal = Math.floor(duracaoMs / 60000);
  const horas = Math.floor(minutosTotal / 60);
  const minutos = minutosTotal % 60;
  return horas > 0 ? `${horas}h ${minutos}min` : `${minutos} min`;
}

function atualizarGrafico(segunda, treinosDaSemana) {
  const distanciasPorDia = Array(7).fill(0);
  for (const treino of treinosDaSemana) {
    const data = new Date(treino.inicio);
    const indiceDia = (data.getDay() + 6) % 7;
    distanciasPorDia[indiceDia] += treino.distanciaKm;
  }

  const maiorDistancia = Math.max(...distanciasPorDia, 0);
  graficoSemana.replaceChildren();
  diasSemana.replaceChildren();

  for (let indice = 0; indice < 7; indice += 1) {
    const data = new Date(segunda);
    data.setDate(segunda.getDate() + indice);
    const barra = document.createElement("div");
    const distancia = distanciasPorDia[indice];
    barra.className = distancia > 0 ? "barra ativa" : "barra";
    barra.style.height =
      maiorDistancia > 0 ? `${Math.max(8, (distancia / maiorDistancia) * 100)}%` : "8%";
    barra.setAttribute(
      "aria-label",
      `${data.toLocaleDateString("pt-BR")}: ${formatarDistancia(distancia)}`,
    );
    graficoSemana.appendChild(barra);

    const dia = document.createElement("span");
    dia.textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
      .format(data)
      .slice(0, 1)
      .toUpperCase();
    diasSemana.appendChild(dia);
  }
}

function atualizarRecorde(atividade, idDistancia, idDetalhe) {
  const recorde = treinos
    .filter((treino) => treino.atividade === atividade)
    .reduce(
      (maior, treino) => (treino.distanciaKm > maior.distanciaKm ? treino : maior),
      { distanciaKm: 0 },
    );

  document.getElementById(idDistancia).textContent =
    recorde.distanciaKm > 0 ? formatarDistancia(recorde.distanciaKm) : "—";
  document.getElementById(idDetalhe).textContent =
    recorde.distanciaKm > 0
      ? new Date(recorde.inicio).toLocaleDateString("pt-BR")
      : "Sem treinos ainda";
}

function atualizarHistorico() {
  historicoTreinos.replaceChildren();
  const recentes = treinos.slice(0, 5);

  if (recentes.length === 0) {
    const vazio = document.createElement("p");
    vazio.className = "vazio";
    vazio.textContent = "Nenhum treino registrado ainda.";
    historicoTreinos.appendChild(vazio);
    return;
  }

  for (const treino of recentes) {
    const linha = document.createElement("div");
    linha.className = "treino";

    const bola = document.createElement("div");
    bola.className = `bola ${atividades[treino.atividade].cor}`;

    const detalhes = document.createElement("div");
    const nome = document.createElement("div");
    nome.className = "nome";
    nome.textContent = atividades[treino.atividade].nome;

    const info = document.createElement("div");
    info.className = "info";
    info.textContent = `${formatarDistancia(treino.distanciaKm)} • ${formatarDuracao(
      treino.duracaoMs,
    )} • ${new Date(treino.inicio).toLocaleDateString("pt-BR")}`;

    detalhes.append(nome, info);
    linha.append(bola, detalhes);
    historicoTreinos.appendChild(linha);
  }
}

function distanciaEntre(posicaoA, posicaoB) {
  const raioTerraMetros = 6371000;
  const radianos = (graus) => (graus * Math.PI) / 180;
  const latitudeA = radianos(posicaoA.latitude);
  const latitudeB = radianos(posicaoB.latitude);
  const diferencaLatitude = radianos(posicaoB.latitude - posicaoA.latitude);
  const diferencaLongitude = radianos(posicaoB.longitude - posicaoA.longitude);
  const a =
    Math.sin(diferencaLatitude / 2) ** 2 +
    Math.cos(latitudeA) *
      Math.cos(latitudeB) *
      Math.sin(diferencaLongitude / 2) ** 2;

  return 2 * raioTerraMetros * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function receberPosicao(posicao) {
  if (inicioTreino === null) {
    return;
  }

  if (posicao.coords.accuracy > 75) {
    mostrarStatus(
      `Sinal GPS fraco (precisão de ${Math.round(
        posicao.coords.accuracy,
      )} m). Aguarde ao ar livre até melhorar.`,
    );
    return;
  }

  const atual = {
    latitude: posicao.coords.latitude,
    longitude: posicao.coords.longitude,
  };
  recebeuPosicao = true;

  if (ultimaPosicao !== null) {
    const trecho = distanciaEntre(ultimaPosicao, atual);
    if (trecho >= 3) {
      distanciaMetros += trecho;
    }
  }

  ultimaPosicao = atual;
  atualizarStatusEmAndamento();
}

function receberErroGps(erro) {
  if (inicioTreino === null) {
    return;
  }

  if (erro.code === 1) {
    limparTreinoEmAndamento();
    botaoTreino.textContent = "INICIAR TREINO";
    seletorAtividade.disabled = false;
    mostrarStatus("Permissão de localização negada. Autorize o GPS para registrar o treino.", true);
    return;
  }

  mostrarStatus("Sem sinal GPS no momento. Verifique a localização do aparelho e tente novamente.", true);
}

function atualizarStatusEmAndamento() {
  mostrarStatus(
    `Treino em andamento · ${formatarDuracao(Date.now() - inicioTreino)} · ${formatarDistancia(
      distanciaMetros / 1000,
    )}`,
  );
}

function limparTreinoEmAndamento() {
  if (idObservador !== null) {
    navigator.geolocation.clearWatch(idObservador);
    idObservador = null;
  }
  if (atualizador !== null) {
    clearInterval(atualizador);
    atualizador = null;
  }
  inicioTreino = null;
  ultimaPosicao = null;
  distanciaMetros = 0;
  recebeuPosicao = false;
}

function iniciarTreino() {
  if (!("geolocation" in navigator)) {
    mostrarStatus("Este navegador não oferece suporte a GPS.", true);
    return;
  }
  if (!window.isSecureContext) {
    mostrarStatus("Para usar o GPS, abra esta página por HTTPS ou localhost.", true);
    return;
  }

  inicioTreino = Date.now();
  ultimaPosicao = null;
  distanciaMetros = 0;
  recebeuPosicao = false;
  seletorAtividade.disabled = true;
  botaoTreino.textContent = "FINALIZAR TREINO";
  mostrarStatus("Solicitando localização GPS...");

  try {
    idObservador = navigator.geolocation.watchPosition(
      receberPosicao,
      receberErroGps,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 120000 },
    );
  } catch (erro) {
    console.error("Não foi possível iniciar o rastreamento GPS.", erro);
    limparTreinoEmAndamento();
    botaoTreino.textContent = "INICIAR TREINO";
    seletorAtividade.disabled = false;
    mostrarStatus("Não foi possível iniciar o GPS. Verifique a permissão de localização.", true);
    return;
  }
  atualizador = setInterval(atualizarStatusEmAndamento, 1000);
}

function finalizarTreino() {
  const duracaoMs = Date.now() - inicioTreino;
  const inicio = inicioTreino;
  const distanciaKm = distanciaMetros / 1000;
  const atividade = seletorAtividade.value;
  const recebeuPosicaoValida = recebeuPosicao;
  limparTreinoEmAndamento();
  botaoTreino.textContent = "INICIAR TREINO";
  seletorAtividade.disabled = false;

  if (!recebeuPosicaoValida) {
    mostrarStatus(
      "O aparelho não forneceu uma posição GPS válida; o treino não foi salvo. Ative a localização e tente em um celular ao ar livre.",
      true,
    );
    return;
  }

  treinos.unshift({ atividade, inicio, duracaoMs, distanciaKm });
  atualizarPainel();
  if (salvarTreinos()) {
    mostrarStatus(
      `Treino salvo neste aparelho · ${formatarDistancia(distanciaKm)} · ${formatarDuracao(duracaoMs)}`,
    );
  } else {
    mostrarStatus("Treino registrado nesta tela, mas não foi possível salvá-lo no aparelho.", true);
  }
}

botaoTreino.addEventListener("click", () => {
  if (inicioTreino !== null) {
    finalizarTreino();
  } else if (!botaoTreino.disabled) {
    iniciarTreino();
  }
});

window.addEventListener("online", atualizarAvisoOffline);
window.addEventListener("offline", atualizarAvisoOffline);
prepararUsoOffline();
atualizarPainel();
