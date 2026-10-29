import express from "express";
import handlebars from "express-handlebars";
import { __dirname } from "./util.js";

const app = express();
const port = 3000;

app.engine("handlebars", handlebars.engine({
  partialsDir: __dirname + "/views/partials",
  helpers: {
    // {{#if (eq a b)}} -> compara dos valores
    eq: (a, b) => a === b,
    // {{inicial "Ana"}} -> "A"
    inicial: (nombre) => String(nombre).charAt(0).toUpperCase(),
    // {{color "Ana"}} -> un color fijo para cada nombre
    color: (nombre) => {
      let hash = 0;
      for (const letra of String(nombre)) hash = (hash * 31 + letra.charCodeAt(0)) % 360;
      return `hsl(${hash}, 65%, 55%)`;
    }
  }
}));
app.set("views", __dirname + "/views");
app.set("view engine", "handlebars");

// Archivos estáticos (CSS, JS del cliente)
app.use(express.static(__dirname + "/public"));
// Leer datos enviados por formularios (req.body)
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ===== Datos del chat (en memoria: se borran al reiniciar el servidor) =====
const mensajes = [];
const MAX_MENSAJES = 100;
const conectados = new Map();     // nombre -> última vez que se vio (ms)
const TIEMPO_EN_LINEA = 6000;     // si no se ve en 6 s, ya no está en línea

function limpiarNombre(valor) {
  return String(valor ?? "").trim().replace(/\s+/g, " ").slice(0, 30);
}

function horaActual() {
  return new Date().toLocaleTimeString("es-CO", {
    hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota"
  });
}

function agregarMensaje(mensaje) {
  mensajes.push({ ...mensaje, hora: horaActual() });
  if (mensajes.length > MAX_MENSAJES) mensajes.shift();
}

function estaEnLinea(nombre) {
  return Date.now() - (conectados.get(nombre) ?? 0) < TIEMPO_EN_LINEA;
}

function usuariosEnLinea() {
  return [...conectados.keys()].filter(estaEnLinea).sort();
}

// ===== Rutas =====
app.get('/', (req, res) => {
  const products = [
    { name_product: "Hamburger chimbisecchions", price: 10 },
    { name_product: "Coke", price: 3 },
    { name_product: "Pancake", price: 8 }
  ];
  res.render("index", {
    title: "Motores",
    username: "Muchachos",
    admin: true,
    product: products
  });
});

// Chat global: si no hay nombre, muestra la pantalla para pedirlo
app.get('/contact', (req, res) => {
  const username = limpiarNombre(req.query.user);

  if (!username || req.query.cambiar) {
    return res.render("login", {
      title: "Chat global · Entrar",
      username,
      cambiar: Boolean(req.query.cambiar)
    });
  }

  if (!estaEnLinea(username)) {
    agregarMensaje({ sistema: true, texto: `${username} se unió al chat` });
  }
  conectados.set(username, Date.now());

  res.render("contact", {
    title: "Chat global",
    username,
    mensajes,
    enLinea: usuariosEnLinea()
  });
});

// Lista de mensajes + usuarios en línea (la usa el script cada 2 s)
app.get('/contact/mensajes', (req, res) => {
  const username = limpiarNombre(req.query.user);
  if (username) conectados.set(username, Date.now());

  const enLinea = usuariosEnLinea();
  res.render("partials/mensajes", { layout: false, username, mensajes }, (error, html) => {
    if (error) return res.status(500).json({ error: "No se pudo renderizar" });
    res.json({ html, enLinea });
  });
});

// Recibir un mensaje nuevo
app.post('/contact', (req, res) => {
  const autor = limpiarNombre(req.body.autor);
  const texto = String(req.body.mensaje ?? "").trim().slice(0, 500);

  if (autor && texto) {
    agregarMensaje({ autor, texto });
    conectados.set(autor, Date.now());
  }

  // Si el envío vino del script, responde sin recargar la página
  if (req.get("Accept")?.includes("application/json")) {
    return res.json({ ok: Boolean(autor && texto) });
  }
  // Si vino del formulario normal, vuelve al chat
  res.redirect("/contact?user=" + encodeURIComponent(autor));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
