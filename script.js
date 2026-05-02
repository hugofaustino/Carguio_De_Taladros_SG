const btnCargar = document.getElementById("btnCargar");
const btnGuardarLista = document.getElementById("btnGuardarLista");
const botonesVista = document.querySelectorAll(".btnVista");

const estado = document.getElementById("estado");
const head = document.getElementById("encabezadoTabla");
const body = document.getElementById("cuerpoTabla");

const selectMes = document.getElementById("selectMes");
const selectBlast = document.getElementById("selectBlast");
const txtVoladuras = document.getElementById("txtVoladuras");

const kpiTotal = document.getElementById("kpiTotal");
const kpiCargados = document.getElementById("kpiCargados");
const kpiPendientes = document.getElementById("kpiPendientes");
const kpiAyudas = document.getElementById("kpiAyudas");
const kpiCargaTotal = document.getElementById("kpiCargaTotal");

const tbodyResumenBulk = document.getElementById("tbodyResumenBulk");
const tbodyResumenLabel = document.getElementById("tbodyResumenLabel");
const tituloGrafico = document.getElementById("tituloGrafico");

const user = "willian.varas@enaex.com";

const listaInicial = `SG-ABRIL | 03.04.2026 09A_3172_003 | 72334
SG-ABRIL | 28.04.2026 09A_3156_001 | 74062
SG-MAYO | 01.05.2026 09A_3180_011 | 74307
SG-MAYO | 01.05.2026 09A_3172_007 | 74312`;

let proyectos = {};
let dataActual = [];
let vistaActual = "estado";
let labelSeleccionado = null;

btnGuardarLista.addEventListener("click", guardarLista);
btnCargar.addEventListener("click", cargarDatos);
selectMes.addEventListener("change", cargarVoladurasDelMes);

botonesVista.forEach(btn => {
  btn.addEventListener("click", () => {
    vistaActual = btn.dataset.vista;

    botonesVista.forEach(b => b.classList.remove("activo"));
    btn.classList.add("activo");

    if (dataActual.length > 0) {
      construirGrafico2D(dataActual, vistaActual);
    }
  });
});

iniciarApp();

function iniciarApp() {
  const listaGuardada = localStorage.getItem("voladurasOPit");

  if (listaGuardada && listaGuardada.trim() !== "") {
    txtVoladuras.value = listaGuardada;
  } else {
    txtVoladuras.value = listaInicial;
    localStorage.setItem("voladurasOPit", listaInicial);
  }

  procesarLista();
  cargarMeses();
  limpiarKpis();
}

function guardarLista() {
  localStorage.setItem("voladurasOPit", txtVoladuras.value);
  procesarLista();
  cargarMeses();
  limpiarTabla();
  limpiarKpis();
  limpiarGrafico();
  limpiarResumenes();
  estado.textContent = "Lista guardada correctamente.";
}

function procesarLista() {
  proyectos = {};

  const lineas = txtVoladuras.value
    .split("\n")
    .map(linea => linea.trim())
    .filter(linea => linea !== "");

  lineas.forEach(linea => {
    const partes = linea.split("|").map(p => p.trim());

    if (partes.length < 3) return;

    const mes = partes[0];
    const nombre = partes[1];
    const blastId = partes[2];

    if (!proyectos[mes]) proyectos[mes] = [];

    proyectos[mes].push({ nombre, blastId });
  });
}

function cargarMeses() {
  selectMes.innerHTML = "";

  Object.keys(proyectos).forEach(mes => {
    const option = document.createElement("option");
    option.value = mes;
    option.textContent = mes;
    selectMes.appendChild(option);
  });

  cargarVoladurasDelMes();
}

function cargarVoladurasDelMes() {
  selectBlast.innerHTML = "";

  const mesSeleccionado = selectMes.value;
  const voladuras = proyectos[mesSeleccionado] || [];

  voladuras.forEach(voladura => {
    const option = document.createElement("option");
    option.value = voladura.blastId;
    option.textContent = voladura.nombre;
    selectBlast.appendChild(option);
  });
}

async function cargarDatos() {
  estado.textContent = "Cargando datos desde OPitBlast...";
  limpiarTabla();
  limpiarKpis();
  limpiarGrafico();
  limpiarResumenes();
  labelSeleccionado = null;

  const blastId = selectBlast.value;

  if (!blastId) {
    estado.textContent = "Selecciona una voladura válida.";
    return;
  }

  const apiUrl = `https://o-pitblast.com/myserver/APIBlasts.php?p=getBoreholesAppJson&blast=${blastId}&user=${user}`;

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) throw new Error("Error HTTP: " + response.status);

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      estado.textContent = "No se encontraron datos.";
      return;
    }

    dataActual = data.map(fila => transformarFila(fila));

    construirTabla(dataActual);
    actualizarKpis(dataActual);
    construirGrafico2D(dataActual, vistaActual);
    construirResumenes(dataActual);

    estado.textContent = `Datos cargados: ${dataActual.length} taladros`;

  } catch (error) {
    console.error("ERROR:", error);
    estado.textContent = "Error: " + error.message;
  }
}

function transformarFila(fila) {
  let explosivos = [];
  let pozo = "";

  try {
    explosivos = JSON.parse(fila.EaQ || "[]");
  } catch {
    explosivos = [];
  }

  try {
    pozo = JSON.parse(fila.Po || "[]")[0] || "";
  } catch {
    pozo = fila.Po || "";
  }

  const bulks = explosivos.filter(e =>
    e.mytype === "bulk" && Number(e.qty) > 0
  );

  const boosters = explosivos.filter(e =>
    e.mytype === "booster" && Number(e.qty) > 0
  );

  const bulkPrincipal = bulks.length > 0 ? bulks[0] : null;
  const totalBulk = bulks.reduce((sum, e) => sum + Number(e.qty || 0), 0);
  const totalBoosters = boosters.reduce((sum, e) => sum + Number(e.qty || 0), 0);
  const nombresBulk = bulks.map(e => e.name).join(" + ");

  const cargado = Number(fila.Ch) === 1;

  const label = String(fila.La || "").trim().toUpperCase();

  const esAyuda =
    label.startsWith("HP") ||
    label.startsWith("H-") ||
    label.startsWith("AY") ||
    label.includes("AYUDA");

  return {
    Estado: cargado ? "CARGADO" : "POR CARGAR",
    Clasificacion: esAyuda ? "AYUDA" : "DISEÑO",
    Primas: cargado ? totalBoosters : "POR CARGAR",
    Tipo_Mezcla: cargado ? (nombresBulk || "SIN MEZCLA") : "POR CARGAR",
    Ch: fila.Ch,
    ID: fila.Id,
    BlastID: fila.BId,
    Taladro: fila.Nu,
    Label: fila.La,
    Pozo: pozo,
    PX: Number(fila.PX || 0),
    PY: Number(fila.PY || 0),
    Longitud: Number(fila.Le || 0),
    Diametro: fila.DiN,
    Carga_Total: cargado ? Number(fila.TE || 0) : 0,
    Bulk: cargado && bulkPrincipal ? bulkPrincipal.name : "",
    Cantidad_Bulk: cargado ? totalBulk : 0,
    Booster: cargado ? boosters.map(e => e.name).join(" + ") : "",
    Cantidad_Booster: cargado ? totalBoosters : 0,
    Tipo: fila.Ty,
    Stemming: fila.STy
  };
}

function construirGrafico2D(data, vista) {
  limpiarGrafico();

  let campo;
  let titulo;

  if (vista === "estado") {
    campo = "Estado";
    titulo = "Estado de carguío";
  } else if (vista === "primas") {
    campo = "Primas";
    titulo = "Cantidad de primas / boosters";
  } else {
    campo = "Tipo_Mezcla";
    titulo = "Tipo de mezcla";
  }

  tituloGrafico.textContent = titulo;

  const dataOrdenada = ordenarCategoriasParaGrafico(data, campo);
  const categorias = [...new Set(dataOrdenada.map(d => String(d[campo] ?? "SIN DATO")))];

  const trazas = categorias.map(categoria => {
    const puntos = dataOrdenada.filter(d => String(d[campo] ?? "SIN DATO") === categoria);

    const esPorCargar = categoria === "POR CARGAR";

    return {
      type: "scatter",
      mode: "markers+text",
      name: categoria,
      x: puntos.map(d => d.PX),
      y: puntos.map(d => d.PY),
      text: puntos.map(d => d.Label),
      customdata: puntos.map(d => d.Label),
      textposition: "top center",
      marker: {
        size: esPorCargar ? 8 : 9,
        opacity: esPorCargar ? 0.65 : 0.95,
        color: esPorCargar ? "#bdbdbd" : undefined,
        line: {
          width: 1,
          color: esPorCargar ? "#8c8c8c" : "#333"
        }
      },
      hovertemplate:
        "<b>%{text}</b><br>" +
        `${titulo}: ${categoria}<br>` +
        "<extra></extra>"
    };
  });

  if (labelSeleccionado) {
    const seleccionado = data.find(d => d.Label === labelSeleccionado);

    if (seleccionado) {
      trazas.push({
        type: "scatter",
        mode: "markers+text",
        name: "Seleccionado",
        x: [seleccionado.PX],
        y: [seleccionado.PY],
        text: [seleccionado.Label],
        textposition: "top center",
        marker: {
          size: 22,
          color: "rgba(227, 6, 19, 0.15)",
          line: {
            width: 4,
            color: "#e30613"
          },
          symbol: "circle-open"
        },
        hovertemplate:
          "<b>%{text}</b><br>" +
          "Taladro seleccionado<extra></extra>",
        showlegend: false
      });
    }
  }

  const layout = {
    margin: { l: 10, r: 10, b: 10, t: 10 },
    showlegend: true,
    legend: {
      orientation: "h",
      x: 0,
      y: 1.08
    },
    xaxis: {
      visible: false,
      showgrid: false,
      zeroline: false,
      scaleanchor: "y",
      scaleratio: 1
    },
    yaxis: {
      visible: false,
      showgrid: false,
      zeroline: false
    },
    dragmode: "pan",
    plot_bgcolor: "white",
    paper_bgcolor: "white"
  };

  const config = {
    responsive: true,
    displaylogo: false,
    scrollZoom: false,
    modeBarButtonsToRemove: [
      "select2d",
      "lasso2d",
      "autoScale2d",
      "toggleSpikelines"
    ]
  };

  Plotly.newPlot("grafico2D", trazas, layout, config);

  const grafico = document.getElementById("grafico2D");

  grafico.on("plotly_click", function(eventData) {
    const label = eventData.points[0].customdata || eventData.points[0].text;
    seleccionarLabel(label);
  });
}

function ordenarCategoriasParaGrafico(data, campo) {
  return [...data].sort((a, b) => {
    const av = String(a[campo] ?? "");
    const bv = String(b[campo] ?? "");

    if (av === "POR CARGAR") return -1;
    if (bv === "POR CARGAR") return 1;

    return av.localeCompare(bv, "es", { numeric: true });
  });
}

function construirResumenes(data) {
  const resumenBulk = {};

  data
    .filter(fila => fila.Estado === "CARGADO")
    .forEach(fila => {
      const nombre = fila.Tipo_Mezcla || "SIN MEZCLA";
      resumenBulk[nombre] = (resumenBulk[nombre] || 0) + Number(fila.Cantidad_Bulk || 0);
    });

  tbodyResumenBulk.innerHTML = "";

  Object.entries(resumenBulk).forEach(([nombre, cantidad]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${nombre}</td>
      <td>${cantidad.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    `;
    tbodyResumenBulk.appendChild(tr);
  });

  const resumenLabel = {};

  data.forEach(fila => {
    const label = fila.Label || "SIN LABEL";
    resumenLabel[label] = (resumenLabel[label] || 0) + Number(fila.Carga_Total || 0);
  });

  tbodyResumenLabel.innerHTML = "";

  Object.entries(resumenLabel)
    .sort((a, b) => String(a[0]).localeCompare(String(b[0]), "es", { numeric: true }))
    .forEach(([label, carga]) => {
      const tr = document.createElement("tr");
      tr.dataset.label = label;
      tr.innerHTML = `
        <td>${label}</td>
        <td>${carga.toLocaleString("es-PE", { maximumFractionDigits: 2 })}</td>
      `;
      tr.addEventListener("click", () => seleccionarLabel(label));
      tbodyResumenLabel.appendChild(tr);
    });
}

function construirTabla(data) {
  limpiarTabla();

  const columnas = Object.keys(data[0]);

  columnas.forEach(col => {
    const th = document.createElement("th");
    th.textContent = col;
    head.appendChild(th);
  });

  data.forEach(fila => {
    const tr = document.createElement("tr");
    tr.dataset.label = fila.Label;

    if (fila.Clasificacion === "AYUDA") {
      tr.classList.add("fila-ayuda");
    } else if (fila.Estado === "CARGADO") {
      tr.classList.add("fila-cargado");
    } else {
      tr.classList.add("fila-pendiente");
    }

    tr.addEventListener("click", () => seleccionarLabel(fila.Label));

    columnas.forEach(col => {
      const td = document.createElement("td");
      td.textContent = fila[col] ?? "";
      tr.appendChild(td);
    });

    body.appendChild(tr);
  });
}

function seleccionarLabel(label) {
  labelSeleccionado = label;

  document.querySelectorAll("[data-label]").forEach(el => {
    el.classList.toggle("fila-seleccionada", el.dataset.label === label);
  });

  construirGrafico2D(dataActual, vistaActual);
}

function actualizarKpis(data) {
  const total = data.length;
  const cargados = data.filter(fila => fila.Estado === "CARGADO").length;
  const pendientes = data.filter(fila => fila.Estado === "POR CARGAR").length;
  const ayudas = data.filter(fila => fila.Clasificacion === "AYUDA").length;

  const cargaTotal = data
    .filter(fila => fila.Estado === "CARGADO")
    .reduce((sum, fila) => sum + Number(fila.Carga_Total || 0), 0);

  kpiTotal.textContent = total;
  kpiCargados.textContent = cargados;
  kpiPendientes.textContent = pendientes;
  kpiAyudas.textContent = ayudas;
  kpiCargaTotal.textContent = `${cargaTotal.toLocaleString("es-PE", { maximumFractionDigits: 2 })} kg`;
}

function limpiarTabla() {
  head.innerHTML = "";
  body.innerHTML = "";
}

function limpiarKpis() {
  kpiTotal.textContent = "0";
  kpiCargados.textContent = "0";
  kpiPendientes.textContent = "0";
  kpiAyudas.textContent = "0";
  kpiCargaTotal.textContent = "0 kg";
}

function limpiarGrafico() {
  const grafico = document.getElementById("grafico2D");
  if (grafico) {
    Plotly.purge("grafico2D");
  }
}

function limpiarResumenes() {
  tbodyResumenBulk.innerHTML = "";
  tbodyResumenLabel.innerHTML = "";
}