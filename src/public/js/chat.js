// Chat global: envía mensajes sin recargar y refresca cada 2 segundos
const form = document.getElementById("form-chat");
const input = document.getElementById("mensaje");
const autor = document.getElementById("autor").value;
const caja = document.getElementById("mensajes");
const enLinea = document.getElementById("en-linea");

// Recordar el nombre para la próxima vez
try { localStorage.setItem("chat-nombre", autor); } catch (e) {}

let ultimoHTML = "";

function bajarAlFinal() {
    caja.scrollTop = caja.scrollHeight;
}

async function cargarMensajes() {
    try {
        const res = await fetch("/contact/mensajes?user=" + encodeURIComponent(autor));
        const datos = await res.json();

        if (datos.html !== ultimoHTML) {      // solo actualiza si hay cambios
            const estabaAbajo = caja.scrollHeight - caja.scrollTop - caja.clientHeight < 60;
            caja.innerHTML = datos.html;
            ultimoHTML = datos.html;
            if (estabaAbajo) bajarAlFinal();
        }

        enLinea.textContent = datos.enLinea.length + " en línea";
        enLinea.title = datos.enLinea.join(", ");
    } catch (error) {
        console.error("No se pudieron cargar los mensajes", error);
    }
}

form.addEventListener("submit", async (evento) => {
    evento.preventDefault();                  // evita que la página se recargue
    const texto = input.value.trim();
    if (!texto) return;

    input.value = "";
    try {
        await fetch("/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({ autor, mensaje: texto })
        });
        await cargarMensajes();
        bajarAlFinal();
    } catch (error) {
        input.value = texto;                  // si falla, devuelve el texto al input
        console.error("No se pudo enviar el mensaje", error);
    }
    input.focus();
});

bajarAlFinal();
cargarMensajes();
setInterval(cargarMensajes, 2000);
