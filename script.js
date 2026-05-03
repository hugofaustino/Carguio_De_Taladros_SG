/* =========================================================
   CONFIGURACIÓN SUPABASE
   =========================================================
   1) Crea la tabla usando el SQL que te dejo en la respuesta.
   2) Copia tu Project URL y tu publishable/anon key de Supabase.
   3) Pégalos aquí.

   IMPORTANTE:
   - La publishable/anon key puede estar en frontend si tus políticas RLS están bien definidas.
   - Si dejas políticas públicas de edición, cualquier persona con el link podría modificar el historial.
*/
const SUPABASE_URL = "https://zrnplnanihhfogerrtyx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_xiNKNP6LpJkfbcoa9IG33w_yMbWRrNF";
const SUPABASE_TABLE = "historial_carga_opit";

let supabaseClient = null;

const panelRangosCarga = document.getElementById("panelRangosCarga");
const btnAplicarRangos = document.getElementById("btnAplicarRangos");
const btnLimpiarRangos = document.getElementById("btnLimpiarRangos");
const botonesFiltroRango = document.querySelectorAll(".btnFiltroRango");
const estadoFiltroRango = document.getElementById("estadoFiltroRango");

const rango1Inicio = document.getElementById("rango1Inicio");
const rango1Fin = document.getElementById("rango1Fin");
const rango2Inicio = document.getElementById("rango2Inicio");
const rango2Fin = document.getElementById("rango2Fin");
const rango3Inicio = document.getElementById("rango3Inicio");
const rango3Fin = document.getElementById("rango3Fin");
const rango4Inicio = document.getElementById("rango4Inicio");
const rango4Fin = document.getElementById("rango4Fin");

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

const estadoSupabase = document.getElementById("estadoSupabase");
const btnRecargarHistorial = document.getElementById("btnRecargarHistorial");
const tbodyHistorialAdmin = document.getElementById("tbodyHistorialAdmin");
const estadoHistorialAdmin = document.getElementById("estadoHistorialAdmin");

const user = "willian.varas@enaex.com";
const HISTORIAL_CARGA_KEY = "historialCargaTaladrosOPit";

const listaInicial = `SG-ABRIL | 03.04.2026 09A_3172_003 | 72334
SG-ABRIL | 28.04.2026 09A_3156_001 | 74062
SG-MAYO | 01.05.2026 09A_3180_011 | 74307
SG-MAYO | 01.05.2026 09A_3172_007 | 74312`;

let proyectos = {};
let dataActual = [];
let vistaActual = "estado";
let labelSeleccionado = null;
let filtroRangoActivo = "TODO";
let historialActualSupabase = [];
let usandoSupabase = false;

let rangoBaseGrafico = null;
let ultimoRangoGrafico = null;

btnAplicarRangos?.addEventListener("click", () => {
  if (vistaActual === "rangos" && dataActual.length > 0) {
    actualizarDashboardAnalitico();
    construirGrafico2D(dataActual, vistaActual, { mantenerRango: false });
  }
});

btnLimpiarRangos?.addEventListener("click", () => {
  limpiarInputsRangosCarga();
  filtroRangoActivo = "TODO";
  actualizarBotonesFiltroRango();

  if (vistaActual === "rangos" && dataActual.length > 0) {
    actualizarDashboardAnalitico();
    construirGrafico2D(dataActual, vistaActual, { mantenerRango: false });
  }
});

[
  rango1Inicio, rango1Fin,
  rango2Inicio, rango2Fin,
  rango3Inicio, rango3Fin,
  rango4Inicio, rango4Fin
].forEach(input => {
  input?.addEventListener("change", () => {
    if (vistaActual === "rangos" && dataActual.length > 0) {
      actualizarDashboardAnalitico();
      construirGrafico2D(dataActual, vistaActual, { mantenerRango: true });
    }
  });
});

botonesFiltroRango.forEach(btn => {
  btn.addEventListener("click", () => {
    filtroRangoActivo = btn.dataset.filtroRango || "TODO";
    actualizarBotonesFiltroRango();

    if (dataActual.length > 0) {
      actualizarDashboardAnalitico();
      construirGrafico2D(dataActual, vistaActual, { mantenerRango: true });
    }
  });
});

btnGuardarLista.addEventListener("click", guardarLista);
btnCargar.addEventListener("click", cargarDatos);
selectMes.addEventListener("change", cargarVoladurasDelMes);

btnRecargarHistorial?.addEventListener("click", async () => {
  await cargarHistorialAdmin();
});

botonesVista.forEach(btn => {
  btn.addEventListener("click", () => {
    vistaActual = btn.dataset.vista;

    botonesVista.forEach(b => b.classList.remove("activo"));
    btn.classList.add("activo");

    actualizarVisibilidadPanelRangos();

    if (vistaActual !== "rangos") {
      filtroRangoActivo = "TODO";
      actualizarBotonesFiltroRango();
    }

    if (dataActual.length > 0) {
      actualizarDashboardAnalitico();
      construirGrafico2D(dataActual, vistaActual, {
        mantenerRango: true
      });
    }
  });
});

iniciarApp();

function iniciarApp() {
  inicializarSupabase();

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
  actualizarVisibilidadPanelRangos();
  actualizarBotonesFiltroRango();
  renderHistorialAdmin([]);
}

function inicializarSupabase() {
  const urlValida = SUPABASE_URL && !SUPABASE_URL.includes("PEGA_AQUI") && SUPABASE_URL.startsWith("https://");
  const keyValida = SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes("PEGA_AQUI");

  if (!urlValida || !keyValida || !window.supabase) {
    usandoSupabase = false;
    supabaseClient = null;
    if (estadoSupabase) {
      estadoSupabase.textContent = "Supabase no configurado · usando respaldo local";
      estadoSupabase.className = "estado-supabase advertencia";
    }
    return;
  }

  const { createClient } = window.supabase;
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  usandoSupabase = true;

  if (estadoSupabase) {
    estadoSupabase.textContent = "Supabase configurado · historial compartido activo";
    estadoSupabase.className = "estado-supabase ok";
  }
}

function guardarLista() {
  localStorage.setItem("voladurasOPit", txtVoladuras.value);
  procesarLista();
  cargarMeses();
  limpiarTabla();
  limpiarKpis();
  limpiarGrafico();
  limpiarResumenes();
  renderHistorialAdmin([]);
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

  renderHistorialAdmin([]);
}

async function cargarDatos() {
  estado.textContent = "Cargando datos desde OPitBlast...";
  limpiarTabla();
  limpiarKpis();
  limpiarGrafico();
  limpiarResumenes();
  renderHistorialAdmin([]);

  labelSeleccionado = null;
  rangoBaseGrafico = null;
  ultimoRangoGrafico = null;
  filtroRangoActivo = "TODO";
  actualizarBotonesFiltroRango();

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

    if (usandoSupabase) {
      dataActual = await aplicarHistorialCargaSupabase(dataActual, blastId);
      await cargarHistorialAdmin();
    } else {
      dataActual = aplicarHistorialCargaLocal(dataActual, blastId);
    }

    actualizarDashboardAnalitico();
    construirGrafico2D(dataActual, vistaActual);

    const origenHistorial = usandoSupabase ? "Supabase" : "localStorage temporal";
    estado.textContent = `Datos cargados: ${dataActual.length} taladros · Historial: ${origenHistorial}`;

  } catch (error) {
    console.error("ERROR:", error);
    estado.textContent = "Error: " + error.message;
  }
}

function esTaladroAyuda(labelRaw) {
  const label = String(labelRaw || "").trim().toUpperCase();

  if (!label) return false;

  if (label.startsWith("HP")) return true;
  if (label.startsWith("AY") || label.includes("AYUDA")) return true;
  if (/^\d+$/.test(label)) return true;
  if (/^H[-_ ]/.test(label)) return true;

  return false;
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
  const esAyuda = esTaladroAyuda(label);

  return {
    Estado: cargado ? "CARGADO" : "POR CARGAR",
    Clasificacion: esAyuda ? "AYUDA" : "DISEÑO",
    Vista_Ayudas: cargado ? (esAyuda ? "AUXILIAR" : "DISEÑO") : "POR CARGAR",
    Primas: cargado ? totalBoosters : "POR CARGAR",
    Tipo_Mezcla: cargado ? (nombresBulk || "SIN MEZCLA") : "POR CARGAR",
    Ch: fila.Ch,
    ID: fila.Id,
    BlastID: fila.BId,
    Taladro: fila.Nu,
    Label: label,
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

function actualizarDashboardAnalitico() {
  const dataAnalitica = obtenerDataAnaliticaActual();

  construirTabla(dataAnalitica);
  actualizarKpis(dataAnalitica);
  construirResumenes(dataAnalitica);
  actualizarTextoFiltroAnalitico(dataAnalitica);
}

function obtenerDataAnaliticaActual() {
  if (vistaActual !== "rangos" || filtroRangoActivo === "TODO") {
    return dataActual;
  }

  const dataConRangos = enriquecerDataVistaRangosCarga(dataActual);

  return dataConRangos.filter(fila =>
    fila.Estado === "CARGADO" &&
    fila.Vista_Rangos_Carga === filtroRangoActivo
  );
}

function actualizarTextoFiltroAnalitico(dataAnalitica) {
  if (!estadoFiltroRango) return;

  if (vistaActual !== "rangos" || filtroRangoActivo === "TODO") {
    estadoFiltroRango.textContent = "Filtro activo: Todo el proyecto";
    return;
  }

  const total = dataAnalitica.length;
  const auxiliares = dataAnalitica.filter(f => f.Clasificacion === "AYUDA").length;
  const carga = dataAnalitica.reduce((sum, f) => sum + Number(f.Carga_Total || 0), 0);

  estadoFiltroRango.textContent =
    `Filtro activo: ${filtroRangoActivo} · ${total} taladros cargados · ${auxiliares} auxiliares · ${carga.toLocaleString("es-PE", { maximumFractionDigits: 2 })} kg`;
}

function actualizarBotonesFiltroRango() {
  botonesFiltroRango.forEach(btn => {
    btn.classList.toggle("activo", btn.dataset.filtroRango === filtroRangoActivo);
  });

  if (estadoFiltroRango) {
    estadoFiltroRango.textContent =
      filtroRangoActivo === "TODO"
        ? "Filtro activo: Todo el proyecto"
        : `Filtro activo: ${filtroRangoActivo}`;
  }
}

function construirGrafico2D(data, vista, opciones = {}) {
  limpiarGrafico();

  const { mantenerRango = true, zoomToLabel = null } = opciones;

  let campo;
  let titulo;
  let dataFuente = [...data];

  if (vista === "estado") {
    campo = "Estado";
    titulo = "Estado de carguío";
  } else if (vista === "primas") {
    campo = "Primas";
    titulo = "Cantidad de primas / boosters";
  } else if (vista === "ayudas") {
    campo = "Vista_Ayudas";
    titulo = "Ayudas";
  } else if (vista === "rangos") {
    dataFuente = enriquecerDataVistaRangosCarga(dataFuente);
    campo = "Vista_Rangos_Carga";
    titulo = "Rangos manuales de carguío";
  } else {
    campo = "Tipo_Mezcla";
    titulo = "Tipo de mezcla";
  }

  tituloGrafico.textContent = titulo;

  const dataLimpia = dataFuente.filter(d =>
    Number.isFinite(d.PX) &&
    Number.isFinite(d.PY) &&
    d.PX !== 0 &&
    d.PY !== 0
  );

  if (dataLimpia.length === 0) return;

  const dataOrdenada = ordenarCategoriasParaGrafico(dataLimpia, campo);
  const categorias = obtenerCategoriasSegunVista(dataOrdenada, campo, vista);

  const coloresPorVista = {
    estado: {
      "POR CARGAR": "#cfcfcf",
      "CARGADO": "#ff7f0e"
    },
    ayudas: {
      "POR CARGAR": "#cfcfcf",
      "AUXILIAR": "#e30613",
      "DISEÑO": "#1f77b4"
    },
    rangos: {
      "POR CARGAR": "#cfcfcf",
      "Rango 1": "#ef4444",
      "Rango 2": "#3b82f6",
      "Rango 3": "#22c55e",
      "Rango 4": "#8b5cf6",
      "FUERA DE RANGO": "#f59e0b",
      "CARGADO SIN FECHA": "#94a3b8"
    }
  };

  const paleta = [
    "#ff7f0e",
    "#2ca02c",
    "#9467bd",
    "#1f77b4",
    "#8c564b",
    "#17becf",
    "#bcbd22",
    "#d62728",
    "#7f7f7f"
  ];

  const trazas = [];

  categorias.forEach((categoria, index) => {
    const puntos = dataOrdenada.filter(d => String(d[campo] ?? "SIN DATO") === categoria);
    const esPorCargar = categoria === "POR CARGAR";

    let colorCategoria = paleta[index % paleta.length];

    if (vista === "estado" && coloresPorVista.estado[categoria]) {
      colorCategoria = coloresPorVista.estado[categoria];
    }

    if (vista === "ayudas" && coloresPorVista.ayudas[categoria]) {
      colorCategoria = coloresPorVista.ayudas[categoria];
    }

    if (vista === "rangos" && coloresPorVista.rangos[categoria]) {
      colorCategoria = coloresPorVista.rangos[categoria];
    }

    if ((vista === "primas" || vista === "mezcla") && esPorCargar) {
      colorCategoria = "#cfcfcf";
    }

    trazas.push({
      type: "scattergl",
      mode: "markers",
      name: categoria,
      x: puntos.map(d => d.PX),
      y: puntos.map(d => d.PY),
      customdata: puntos.map(d => [
        d.Label,
        d.Estado,
        d.Clasificacion,
        d.Primas,
        d.Tipo_Mezcla,
        d.Bulk,
        d.Carga_Total,
        d.Fecha_Cargado_Detectada || "",
        d[campo] || ""
      ]),
      marker: {
        size: esPorCargar ? 7 : 8,
        opacity: esPorCargar ? 0.65 : 0.92,
        color: colorCategoria,
        line: {
          width: esPorCargar ? 1 : 1.2,
          color: esPorCargar ? "#8a8a8a" : "#ffffff"
        }
      },
      hovertemplate:
        "<b>%{customdata[0]}</b><br>" +
        "Estado: %{customdata[1]}<br>" +
        "Clasificación: %{customdata[2]}<br>" +
        "Primas: %{customdata[3]}<br>" +
        "Mezcla: %{customdata[4]}<br>" +
        "Bulk: %{customdata[5]}<br>" +
        "Carga: %{customdata[6]:,.2f} kg<br>" +
        "Fecha detectada: %{customdata[7]}<br>" +
        "Grupo visual: %{customdata[8]}" +
        "<extra></extra>"
    });
  });

  const xs = dataOrdenada.map(d => d.PX);
  const ys = dataOrdenada.map(d => d.PY);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const rangoX = maxX - minX || 1;
  const rangoY = maxY - minY || 1;

  const padX = rangoX * 0.08;
  const padY = rangoY * 0.08;

  rangoBaseGrafico = {
    x: [minX - padX, maxX + padX],
    y: [minY - padY, maxY + padY]
  };

  const indiceTraceLabels = trazas.length;

  trazas.push({
    type: "scatter",
    mode: "text",
    name: "Labels",
    x: dataOrdenada.map(d => d.PX),
    y: dataOrdenada.map(d => d.PY),
    text: construirTextosLabels(dataOrdenada),
    customdata: dataOrdenada.map(d => d.Label),
    textposition: "top center",
    textfont: {
      size: 9,
      color: "#111111",
      family: "Arial, sans-serif"
    },
    hoverinfo: "skip",
    showlegend: false
  });

  if (labelSeleccionado) {
    const seleccionado = dataOrdenada.find(d => d.Label === labelSeleccionado);

    if (seleccionado) {
      trazas.push({
        type: "scatter",
        mode: "markers",
        name: "Seleccionado",
        x: [seleccionado.PX],
        y: [seleccionado.PY],
        customdata: [seleccionado.Label],
        marker: {
          size: 22,
          color: "rgba(227, 6, 19, 0.10)",
          line: {
            width: 4,
            color: "#e30613"
          },
          symbol: "circle-open"
        },
        hovertemplate:
          "<b>%{customdata}</b><br>" +
          "Taladro seleccionado<extra></extra>",
        showlegend: false
      });
    }
  }

  let rangoInicial = rangoBaseGrafico;

  if (zoomToLabel) {
    rangoInicial = obtenerRangoZoomLabel(zoomToLabel, dataOrdenada) || rangoBaseGrafico;
  } else if (mantenerRango && ultimoRangoGrafico) {
    rangoInicial = ultimoRangoGrafico;
  }

  const layout = {
    margin: { l: 40, r: 20, b: 35, t: 20 },
    showlegend: true,
    legend: {
      orientation: "h",
      x: 0,
      y: 1.08,
      font: {
        size: 11,
        color: "#10233f"
      }
    },
    xaxis: {
      visible: true,
      showgrid: true,
      gridcolor: "#e5e7eb",
      zeroline: false,
      showticklabels: false,
      range: [...rangoInicial.x],
      scaleanchor: "y",
      scaleratio: 1
    },
    yaxis: {
      visible: true,
      showgrid: true,
      gridcolor: "#e5e7eb",
      zeroline: false,
      showticklabels: false,
      range: [...rangoInicial.y]
    },
    dragmode: "pan",
    hovermode: "closest",
    plot_bgcolor: "white",
    paper_bgcolor: "white"
  };

  const config = {
    responsive: true,
    displaylogo: false,
    scrollZoom: true,
    modeBarButtonsToRemove: [
      "select2d",
      "lasso2d",
      "autoScale2d",
      "toggleSpikelines"
    ]
  };

  Plotly.newPlot("grafico2D", trazas, layout, config).then(grafico => {
    ultimoRangoGrafico = leerRangosActualesGrafico(grafico);

    if (typeof grafico.removeAllListeners === "function") {
      grafico.removeAllListeners("plotly_click");
      grafico.removeAllListeners("plotly_relayout");
      grafico.removeAllListeners("plotly_doubleclick");
    }

    actualizarEtiquetasPorZoom(grafico, dataOrdenada, indiceTraceLabels);

    grafico.on("plotly_click", function(eventData) {
      const punto = eventData.points[0];

      let label = null;

      if (Array.isArray(punto.customdata)) {
        label = punto.customdata[0];
      } else {
        label = punto.customdata || punto.text;
      }

      if (label) {
        seleccionarLabel(label, {
          autoScroll: true,
          zoomGrafico: false
        });
      }
    });

    grafico.on("plotly_relayout", function() {
      ultimoRangoGrafico = leerRangosActualesGrafico(grafico);
      actualizarEtiquetasPorZoom(grafico, dataOrdenada, indiceTraceLabels);
    });
  });
}

function construirTextosLabels(data) {
  return data.map(d => {
    if (d.Label === labelSeleccionado) {
      return `<b>${d.Label}</b>`;
    }
    return d.Label;
  });
}

function leerRangosActualesGrafico(grafico) {
  if (!grafico?.layout?.xaxis?.range || !grafico?.layout?.yaxis?.range) return null;

  return {
    x: [
      Number(grafico.layout.xaxis.range[0]),
      Number(grafico.layout.xaxis.range[1])
    ],
    y: [
      Number(grafico.layout.yaxis.range[0]),
      Number(grafico.layout.yaxis.range[1])
    ]
  };
}

function calcularFactorZoom(grafico) {
  if (!rangoBaseGrafico) return 1;

  const rangosActuales = leerRangosActualesGrafico(grafico);
  if (!rangosActuales) return 1;

  const anchoBase = Math.abs(rangoBaseGrafico.x[1] - rangoBaseGrafico.x[0]) || 1;
  const altoBase = Math.abs(rangoBaseGrafico.y[1] - rangoBaseGrafico.y[0]) || 1;

  const anchoActual = Math.abs(rangosActuales.x[1] - rangosActuales.x[0]) || 1;
  const altoActual = Math.abs(rangosActuales.y[1] - rangosActuales.y[0]) || 1;

  const factorX = anchoBase / anchoActual;
  const factorY = altoBase / altoActual;

  return Math.max(factorX, factorY, 1);
}

function actualizarEtiquetasPorZoom(grafico, dataOrdenada, indiceTraceLabels) {
  const factorZoom = calcularFactorZoom(grafico);

  const incremento = factorZoom <= 1
    ? 0
    : Math.min(7, Math.log2(factorZoom) * 1.4);

  const tamanoBase = 8.5 + incremento;

  const tamanos = dataOrdenada.map(d => {
    if (d.Label === labelSeleccionado) {
      return Math.min(tamanoBase + 2, 20);
    }
    return Math.min(tamanoBase, 18);
  });

  Plotly.restyle(
    grafico,
    {
      text: [construirTextosLabels(dataOrdenada)],
      "textfont.size": [tamanos]
    },
    [indiceTraceLabels]
  );
}

function obtenerRangoZoomLabel(label, dataOrdenada) {
  const punto = dataOrdenada.find(d => d.Label === label);
  if (!punto || !rangoBaseGrafico) return null;

  const anchoBase = Math.abs(rangoBaseGrafico.x[1] - rangoBaseGrafico.x[0]) || 1;
  const altoBase = Math.abs(rangoBaseGrafico.y[1] - rangoBaseGrafico.y[0]) || 1;

  const anchoZoom = anchoBase * 0.18;
  const altoZoom = altoBase * 0.18;

  return {
    x: [punto.PX - anchoZoom / 2, punto.PX + anchoZoom / 2],
    y: [punto.PY - altoZoom / 2, punto.PY + altoZoom / 2]
  };
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
      tr.addEventListener("click", () => {
        seleccionarLabel(label, {
          autoScroll: true,
          zoomGrafico: true
        });
      });
      tbodyResumenLabel.appendChild(tr);
    });
}

function construirTabla(data) {
  limpiarTabla();

  if (!data || data.length === 0) {
    const th = document.createElement("th");
    th.textContent = "Sin datos para el filtro seleccionado";
    head.appendChild(th);
    return;
  }

  const columnas = Object.keys(data[0]).filter(col =>
    !col.startsWith("_") &&
    col !== "Vista_Rangos_Carga" &&
    col !== "Color_Rango_Carga"
  );

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

    tr.addEventListener("click", () => {
      seleccionarLabel(fila.Label, {
        autoScroll: true,
        zoomGrafico: true
      });
    });

    columnas.forEach(col => {
      const td = document.createElement("td");
      td.textContent = fila[col] ?? "";
      tr.appendChild(td);
    });

    body.appendChild(tr);
  });
}

function aplicarResaltadoTablas(label) {
  document.querySelectorAll("[data-label]").forEach(el => {
    el.classList.toggle("fila-seleccionada", el.dataset.label === label);
  });
}

function desplazarTablasASeleccion(label) {
  const filaResumen = Array.from(tbodyResumenLabel.querySelectorAll("tr[data-label]"))
    .find(el => el.dataset.label === label);

  const filaDetalle = Array.from(body.querySelectorAll("tr[data-label]"))
    .find(el => el.dataset.label === label);

  if (filaResumen) {
    moverScrollInterno(filaResumen, ".scroll-tabla");
  }

  if (filaDetalle) {
    moverScrollInterno(filaDetalle, ".tabla-detalle");
  }
}

function moverScrollInterno(fila, selectorContenedor) {
  const contenedor = fila.closest(selectorContenedor);

  if (!contenedor) return;

  const topFila = fila.offsetTop;
  const altoFila = fila.offsetHeight;
  const altoContenedor = contenedor.clientHeight;

  const nuevaPosicion = topFila - altoContenedor / 2 + altoFila / 2;

  contenedor.scrollTo({
    top: Math.max(nuevaPosicion, 0),
    behavior: "smooth"
  });
}

function seleccionarLabel(label, opciones = {}) {
  const {
    autoScroll = true,
    zoomGrafico = false
  } = opciones;

  labelSeleccionado = label;

  aplicarResaltadoTablas(label);

  if (autoScroll) {
    desplazarTablasASeleccion(label);
  }

  construirGrafico2D(dataActual, vistaActual, {
    mantenerRango: !zoomGrafico,
    zoomToLabel: zoomGrafico ? label : null
  });
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

/* =========================================================
   HISTORIAL LOCAL: respaldo temporal si Supabase no está configurado
   ========================================================= */
function cargarHistorialCargaLocal() {
  try {
    return JSON.parse(localStorage.getItem(HISTORIAL_CARGA_KEY) || "{}");
  } catch {
    return {};
  }
}

function guardarHistorialCargaLocal(historial) {
  localStorage.setItem(HISTORIAL_CARGA_KEY, JSON.stringify(historial));
}

function aplicarHistorialCargaLocal(data, blastId) {
  const historial = cargarHistorialCargaLocal();
  const ahora = new Date();
  const ahoraISO = ahora.toISOString();
  const ahoraTexto = formatearFechaHora(ahora);

  const dataConHistorial = data.map(fila => {
    const clave = crearClaveTaladro(fila, blastId);
    const chActual = Number(fila.Ch);
    const estaCargado = chActual === 1;

    if (!historial[clave]) {
      historial[clave] = {
        blastId: blastId,
        id: fila.ID,
        label: fila.Label,
        taladro: fila.Taladro,
        ultimoCh: chActual,
        fechaInicioSeguimientoISO: ahoraISO,
        fechaInicioSeguimientoTexto: ahoraTexto,
        fechaCargaDetectadaISO: estaCargado ? ahoraISO : null,
        fechaCargaDetectadaTexto: estaCargado ? ahoraTexto : "",
        metodoFechaCarga: estaCargado
          ? "Ya cargado al iniciar seguimiento"
          : "Pendiente"
      };
    } else {
      const registro = historial[clave];
      const chAnterior = Number(registro.ultimoCh);

      if (chAnterior !== 1 && chActual === 1 && !registro.fechaCargaDetectadaISO) {
        registro.fechaCargaDetectadaISO = ahoraISO;
        registro.fechaCargaDetectadaTexto = ahoraTexto;
        registro.metodoFechaCarga = "Cambio detectado de Ch=0 a Ch=1";
      }

      registro.ultimoCh = chActual;
      registro.ultimaRevisionISO = ahoraISO;
      registro.ultimaRevisionTexto = ahoraTexto;
      registro.label = fila.Label;
      registro.taladro = fila.Taladro;
      registro.id = fila.ID;
    }

    const registroFinal = historial[clave];

    return {
      ...fila,
      Fecha_Cargado_Detectada: estaCargado
        ? registroFinal.fechaCargaDetectadaTexto || ""
        : "",
      _Fecha_Cargado_Detectada_ISO: estaCargado
        ? registroFinal.fechaCargaDetectadaISO || ""
        : "",
      Metodo_Fecha_Carga: estaCargado
        ? registroFinal.metodoFechaCarga || ""
        : "Pendiente",
      Ultima_Revision_Dashboard: ahoraTexto
    };
  });

  guardarHistorialCargaLocal(historial);

  return dataConHistorial;
}

/* =========================================================
   HISTORIAL SUPABASE: fuente central compartida
   ========================================================= */
function limpiarParteClave(valor) {
  return String(valor ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9_.-]/g, "");
}

function crearClaveTaladro(fila, blastId) {
  const id = limpiarParteClave(fila.ID);
  const label = limpiarParteClave(fila.Label);
  const taladro = limpiarParteClave(fila.Taladro);

  const px = Number.isFinite(Number(fila.PX))
    ? `PX${Number(fila.PX).toFixed(3)}`
    : "PXNA";

  const py = Number.isFinite(Number(fila.PY))
    ? `PY${Number(fila.PY).toFixed(3)}`
    : "PYNA";

  const partes = [
    limpiarParteClave(blastId),
    id || "NOID",
    label || "NOLABEL",
    taladro || "NOTALADRO",
    px,
    py
  ];

  return partes.join("_");
}

function formatearFechaHora(fecha) {
  return fecha.toLocaleString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function formatearFechaHoraDesdeISO(iso) {
  if (!iso) return "";
  const fecha = new Date(iso);
  if (!(fecha instanceof Date) || isNaN(fecha)) return "";
  return formatearFechaHora(fecha);
}

function convertirISOAInputDatetimeLocal(iso) {
  if (!iso) return "";
  const fecha = new Date(iso);
  if (!(fecha instanceof Date) || isNaN(fecha)) return "";

  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const dd = String(fecha.getDate()).padStart(2, "0");
  const hh = String(fecha.getHours()).padStart(2, "0");
  const mi = String(fecha.getMinutes()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function convertirInputDatetimeLocalAISO(valor) {
  if (!valor) return null;
  const fecha = new Date(valor);
  if (!(fecha instanceof Date) || isNaN(fecha)) return null;
  return fecha.toISOString();
}

async function obtenerHistorialSupabase(blastId) {
  if (!supabaseClient) return [];

  const { data, error } = await supabaseClient
    .from(SUPABASE_TABLE)
    .select("*")
    .eq("blast_id", String(blastId));

  if (error) throw new Error("Supabase select: " + error.message);

  return Array.isArray(data) ? data : [];
}

async function upsertHistorialSupabase(registros) {
  if (!supabaseClient || registros.length === 0) return;

  const { error } = await supabaseClient
    .from(SUPABASE_TABLE)
    .upsert(registros, { onConflict: "clave" });

  if (error) throw new Error("Supabase upsert: " + error.message);
}

function crearRegistroSupabaseDesdeFila(fila, blastId, ahoraISO, ahoraTexto) {
  const chActual = Number(fila.Ch);
  const estaCargado = chActual === 1;
  const fechaCargaISO = estaCargado ? ahoraISO : null;
  const fechaCargaTexto = estaCargado ? ahoraTexto : "";

  return {
    clave: crearClaveTaladro(fila, blastId),
    blast_id: String(blastId),
    taladro_id: fila.ID ? String(fila.ID) : null,
    label: fila.Label || "",
    taladro: fila.Taladro ? String(fila.Taladro) : "",
    ultimo_ch: chActual,
    fecha_inicio_seguimiento: ahoraISO,
    fecha_inicio_seguimiento_texto: ahoraTexto,
    fecha_carga_detectada: fechaCargaISO,
    fecha_carga_detectada_texto: fechaCargaTexto,
    metodo_fecha_carga: estaCargado ? "Ya cargado al iniciar seguimiento" : "Pendiente",
    ultima_revision: ahoraISO,
    ultima_revision_texto: ahoraTexto,
    editado_manualmente: false,
    comentario_edicion: "",
    updated_at: ahoraISO
  };
}

function actualizarRegistroSupabaseDesdeFila(registro, fila, ahoraISO, ahoraTexto) {
  const chAnterior = Number(registro.ultimo_ch);
  const chActual = Number(fila.Ch);
  const estaCargado = chActual === 1;

  const salida = {
    ...registro,
    taladro_id: fila.ID ? String(fila.ID) : registro.taladro_id,
    label: fila.Label || registro.label || "",
    taladro: fila.Taladro ? String(fila.Taladro) : registro.taladro || "",
    ultimo_ch: chActual,
    ultima_revision: ahoraISO,
    ultima_revision_texto: ahoraTexto,
    updated_at: ahoraISO
  };

  if (chAnterior !== 1 && estaCargado && !registro.fecha_carga_detectada) {
    salida.fecha_carga_detectada = ahoraISO;
    salida.fecha_carga_detectada_texto = ahoraTexto;
    salida.metodo_fecha_carga = "Cambio detectado de Ch=0 a Ch=1";
  }

  if (!estaCargado && !salida.metodo_fecha_carga) {
    salida.metodo_fecha_carga = "Pendiente";
  }

  return salida;
}

async function aplicarHistorialCargaSupabase(data, blastId) {
  const historial = await obtenerHistorialSupabase(blastId);
  const historialPorClave = new Map(historial.map(registro => [registro.clave, registro]));

  const ahora = new Date();
  const ahoraISO = ahora.toISOString();
  const ahoraTexto = formatearFechaHora(ahora);

  const registrosPorClaveParaGuardar = new Map();
  const registrosFinalesPorClave = new Map();

  data.forEach(fila => {
    const clave = crearClaveTaladro(fila, blastId);
    const registroExistente = historialPorClave.get(clave) || registrosPorClaveParaGuardar.get(clave);

    const registroFinal = registroExistente
      ? actualizarRegistroSupabaseDesdeFila(registroExistente, fila, ahoraISO, ahoraTexto)
      : crearRegistroSupabaseDesdeFila(fila, blastId, ahoraISO, ahoraTexto);

    registrosPorClaveParaGuardar.set(clave, registroFinal);
    registrosFinalesPorClave.set(clave, registroFinal);
  });

  await upsertHistorialSupabase(Array.from(registrosPorClaveParaGuardar.values()));

  historialActualSupabase = Array.from(registrosFinalesPorClave.values());

  return data.map(fila => {
    const clave = crearClaveTaladro(fila, blastId);
    const registro = registrosFinalesPorClave.get(clave);
    const estaCargado = Number(fila.Ch) === 1;

    const fechaISO = registro?.fecha_carga_detectada || "";
    const fechaTexto = registro?.fecha_carga_detectada_texto || formatearFechaHoraDesdeISO(fechaISO);

    return {
      ...fila,
      Fecha_Cargado_Detectada: estaCargado ? fechaTexto : "",
      _Fecha_Cargado_Detectada_ISO: estaCargado ? fechaISO : "",
      Metodo_Fecha_Carga: estaCargado ? (registro?.metodo_fecha_carga || "") : "Pendiente",
      Ultima_Revision_Dashboard: ahoraTexto,
      Editado_Manualmente: registro?.editado_manualmente ? "Sí" : "No",
      Comentario_Edicion: registro?.comentario_edicion || ""
    };
  });
}

async function cargarHistorialAdmin() {
  const blastId = selectBlast.value;

  if (!blastId) {
    renderHistorialAdmin([]);
    return;
  }

  if (!usandoSupabase || !supabaseClient) {
    if (estadoHistorialAdmin) {
      estadoHistorialAdmin.textContent = "Supabase no está configurado. No hay historial central para editar.";
    }
    renderHistorialAdmin([]);
    return;
  }

  try {
    const historial = await obtenerHistorialSupabase(blastId);
    historialActualSupabase = historial;
    renderHistorialAdmin(historial);
  } catch (error) {
    console.error(error);
    if (estadoHistorialAdmin) {
      estadoHistorialAdmin.textContent = "Error al cargar historial: " + error.message;
    }
  }
}

function renderHistorialAdmin(historial) {
  if (!tbodyHistorialAdmin) return;

  tbodyHistorialAdmin.innerHTML = "";

  if (!historial || historial.length === 0) {
    if (estadoHistorialAdmin) {
      estadoHistorialAdmin.textContent = usandoSupabase
        ? "Sin historial para mostrar. Primero carga datos de una voladura."
        : "Supabase no configurado. Se usará localStorage temporal.";
    }
    return;
  }

  if (estadoHistorialAdmin) {
    estadoHistorialAdmin.textContent = `Historial cargado: ${historial.length} registros. Puedes corregir la fecha y guardar por fila.`;
  }

  [...historial]
    .sort((a, b) => String(a.label || "").localeCompare(String(b.label || ""), "es", { numeric: true }))
    .forEach(registro => {
      const tr = document.createElement("tr");
      tr.dataset.clave = registro.clave;
      tr.dataset.label = registro.label || "";

      const fechaInput = convertirISOAInputDatetimeLocal(registro.fecha_carga_detectada);
      const metodo = registro.metodo_fecha_carga || "";
      const comentario = registro.comentario_edicion || "";

      tr.innerHTML = `
        <td>${registro.label || ""}</td>
        <td>${registro.taladro || ""}</td>
        <td>${registro.ultimo_ch ?? ""}</td>
        <td><input type="datetime-local" class="inputFechaHistorial" value="${fechaInput}"></td>
        <td><input type="text" class="inputMetodoHistorial" value="${escapeHtmlAttr(metodo)}"></td>
        <td><input type="text" class="inputComentarioHistorial" value="${escapeHtmlAttr(comentario)}" placeholder="Opcional"></td>
        <td>
          <button type="button" class="btnGuardarHistorialFila">Guardar</button>
          <button type="button" class="btnLimpiarFechaFila">Limpiar fecha</button>
        </td>
      `;

      tr.querySelector(".btnGuardarHistorialFila")?.addEventListener("click", async () => {
        await guardarEdicionHistorialFila(registro.clave, tr, false);
      });

      tr.querySelector(".btnLimpiarFechaFila")?.addEventListener("click", async () => {
        tr.querySelector(".inputFechaHistorial").value = "";
        await guardarEdicionHistorialFila(registro.clave, tr, true);
      });

      tbodyHistorialAdmin.appendChild(tr);
    });
}

function escapeHtmlAttr(valor) {
  return String(valor || "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function guardarEdicionHistorialFila(clave, filaHtml, limpiarFecha) {
  if (!supabaseClient) return;

  const inputFecha = filaHtml.querySelector(".inputFechaHistorial");
  const inputMetodo = filaHtml.querySelector(".inputMetodoHistorial");
  const inputComentario = filaHtml.querySelector(".inputComentarioHistorial");

  const fechaISO = limpiarFecha ? null : convertirInputDatetimeLocalAISO(inputFecha?.value || "");
  const fechaTexto = fechaISO ? formatearFechaHoraDesdeISO(fechaISO) : "";
  const ahoraISO = new Date().toISOString();

  const payload = {
    fecha_carga_detectada: fechaISO,
    fecha_carga_detectada_texto: fechaTexto,
    metodo_fecha_carga: inputMetodo?.value?.trim() || (fechaISO ? "Editado manualmente" : "Pendiente"),
    comentario_edicion: inputComentario?.value?.trim() || "",
    editado_manualmente: true,
    updated_at: ahoraISO
  };

  try {
    const { error } = await supabaseClient
      .from(SUPABASE_TABLE)
      .update(payload)
      .eq("clave", clave);

    if (error) throw new Error(error.message);

    if (estadoHistorialAdmin) {
      estadoHistorialAdmin.textContent = "Edición guardada correctamente. Actualizando dashboard...";
    }

    await cargarDatos();
  } catch (error) {
    console.error(error);
    if (estadoHistorialAdmin) {
      estadoHistorialAdmin.textContent = "Error al guardar edición: " + error.message;
    }
  }
}

function actualizarVisibilidadPanelRangos() {
  if (!panelRangosCarga) return;
  panelRangosCarga.classList.toggle("oculto", vistaActual !== "rangos");
}

function limpiarInputsRangosCarga() {
  [
    rango1Inicio, rango1Fin,
    rango2Inicio, rango2Fin,
    rango3Inicio, rango3Fin,
    rango4Inicio, rango4Fin
  ].forEach(input => {
    if (input) input.value = "";
  });
}

function obtenerRangosCargaUsuario() {
  const rangos = [
    {
      nombre: "Rango 1",
      color: "#ef4444",
      inicio: rango1Inicio?.value ? new Date(rango1Inicio.value) : null,
      fin: rango1Fin?.value ? new Date(rango1Fin.value) : null
    },
    {
      nombre: "Rango 2",
      color: "#3b82f6",
      inicio: rango2Inicio?.value ? new Date(rango2Inicio.value) : null,
      fin: rango2Fin?.value ? new Date(rango2Fin.value) : null
    },
    {
      nombre: "Rango 3",
      color: "#22c55e",
      inicio: rango3Inicio?.value ? new Date(rango3Inicio.value) : null,
      fin: rango3Fin?.value ? new Date(rango3Fin.value) : null
    },
    {
      nombre: "Rango 4",
      color: "#8b5cf6",
      inicio: rango4Inicio?.value ? new Date(rango4Inicio.value) : null,
      fin: rango4Fin?.value ? new Date(rango4Fin.value) : null
    }
  ];

  return rangos.filter(r =>
    r.inicio instanceof Date &&
    !isNaN(r.inicio) &&
    r.fin instanceof Date &&
    !isNaN(r.fin) &&
    r.fin >= r.inicio
  );
}

function clasificarPorRangoCarga(fila) {
  if (fila.Estado !== "CARGADO") {
    return {
      categoria: "POR CARGAR",
      color: "#cfcfcf"
    };
  }

  const fechaISO = fila._Fecha_Cargado_Detectada_ISO;

  if (!fechaISO) {
    return {
      categoria: "CARGADO SIN FECHA",
      color: "#94a3b8"
    };
  }

  const fechaCarga = new Date(fechaISO);

  if (!(fechaCarga instanceof Date) || isNaN(fechaCarga)) {
    return {
      categoria: "CARGADO SIN FECHA",
      color: "#94a3b8"
    };
  }

  const rangos = obtenerRangosCargaUsuario();

  const rangoEncontrado = rangos.find(r =>
    fechaCarga >= r.inicio && fechaCarga <= r.fin
  );

  if (rangoEncontrado) {
    return {
      categoria: rangoEncontrado.nombre,
      color: rangoEncontrado.color
    };
  }

  return {
    categoria: "FUERA DE RANGO",
    color: "#f59e0b"
  };
}

function enriquecerDataVistaRangosCarga(data) {
  return data.map(fila => {
    const clasificacion = clasificarPorRangoCarga(fila);

    return {
      ...fila,
      Vista_Rangos_Carga: clasificacion.categoria,
      Color_Rango_Carga: clasificacion.color
    };
  });
}

function obtenerCategoriasSegunVista(data, campo, vista) {
  const categoriasExistentes = [...new Set(data.map(d => String(d[campo] ?? "SIN DATO")))];

  if (vista === "rangos") {
    const orden = [
      "POR CARGAR",
      "Rango 1",
      "Rango 2",
      "Rango 3",
      "Rango 4",
      "FUERA DE RANGO",
      "CARGADO SIN FECHA"
    ];
    return orden.filter(cat => categoriasExistentes.includes(cat));
  }

  if (vista === "ayudas") {
    const orden = ["POR CARGAR", "AUXILIAR", "DISEÑO"];
    return orden.filter(cat => categoriasExistentes.includes(cat));
  }

  if (vista === "estado") {
    const orden = ["POR CARGAR", "CARGADO"];
    return orden.filter(cat => categoriasExistentes.includes(cat));
  }

  return categoriasExistentes;
}
