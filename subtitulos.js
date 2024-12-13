// Primero añadimos los estilos
const style = document.createElement('style');
style.textContent = `
    .loading-container {
        text-align: center;
        padding: 20px;
    }
    .loading-spinner {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 10px auto;
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    .progress-detail {
        margin-top: 10px;
        color: #666;
        font-style: italic;
    }
`;
document.head.appendChild(style);

// Luego la función de actualizar estado
function actualizarEstado(mensaje, progreso = '') {
    const status = document.getElementById('status');
    status.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <div>${mensaje}</div>
            <div class="progress-detail">${progreso}</div>
        </div>
    `;
}
function dividirTexto(texto, maxCaracteres) {
    const palabras = texto.trim().split(' ');
    const lineas = [];
    let lineaActual = '';

    palabras.forEach(palabra => {
        if ((lineaActual + ' ' + palabra).length <= maxCaracteres) {
            lineaActual += (lineaActual ? ' ' : '') + palabra;
        } else {
            if (lineaActual) lineas.push(lineaActual);
            lineaActual = palabra;
        }
    });
    
    if (lineaActual) {
        lineas.push(lineaActual);
    }
    
    return lineas;
}

function leerArchivo(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

function calcularTiempoPorFrase(frase) {
    const palabras = frase.split(' ').length;
    const tiempo = 4 + (palabras * 0.5);
    return Math.min(Math.max(tiempo, 4), 10);
}

async function procesarVideo() {
    const status = document.getElementById('status');
    const textFile = document.getElementById('textFile').files[0];

    if (!textFile) {
        status.textContent = 'Por favor, selecciona un archivo de texto';
        return;
    }

    try {
        actualizarEstado('Leyendo archivo de texto...');
        const texto = await leerArchivo(textFile);
        
        if (texto.length > 50000) {
            actualizarEstado('El texto es demasiado largo. Máximo 50,000 caracteres.');
            return;
        }
    
        actualizarEstado('Preparando frases...');
        const frases = texto.split(/[.!?]+/).filter(frase => frase.trim().length > 0);
    

        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');

        const stream = canvas.captureStream(30);
        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9'
        });

        const chunks = [];
        mediaRecorder.ondataavailable = e => chunks.push(e.data);
        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const videoUrl = URL.createObjectURL(blob);
            document.getElementById('preview').src = videoUrl;
            
            const container = document.createElement('div');
            container.style.marginTop = '20px';
            
            const downloadBtn = document.createElement('button');
            downloadBtn.innerHTML = 'Descargar Video';
            downloadBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = videoUrl;
                a.download = 'video_subtitulos.webm';
                a.click();
            };
            
            const newBtn = document.createElement('button');
            newBtn.innerHTML = 'Crear Nuevo Video';
            newBtn.style.marginLeft = '10px';
            newBtn.onclick = () => location.reload();
            
            container.appendChild(downloadBtn);
            container.appendChild(newBtn);
            status.textContent = 'Video completado. ';
            status.appendChild(container);
        };

        mediaRecorder.start();

        let tiempoTranscurrido = 0;
        let tiempoAcumulado = 0;
        let fraseActual = 0;

        const animar = () => {
            if (fraseActual < frases.length) {
                // Actualización del estado con progreso
                const progreso = Math.floor((fraseActual / frases.length) * 100);
                actualizarEstado(
                    'Generando video...', 
                    `Procesando frase ${fraseActual + 1} de ${frases.length} (${progreso}%)\nTiempo: ${Math.floor(tiempoTranscurrido)}s`
                );
        
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
        
                const posicionY = canvas.height / 2;
                const lineas = dividirTexto(frases[fraseActual], 40);
                const espaciadoLineas = 50;
                const alturaTotal = lineas.length * espaciadoLineas;
        
                ctx.font = 'bold 40px Arial';
                ctx.textAlign = 'center';
                
                lineas.forEach((linea, index) => {
                    const y = posicionY - (alturaTotal/2) + (index * espaciadoLineas) + 30;
                    ctx.fillStyle = 'white';
                    ctx.fillText(linea, canvas.width/2, y);
                });
        
                const tiempoNecesario = calcularTiempoPorFrase(frases[fraseActual]);
                
                if (tiempoTranscurrido >= tiempoAcumulado + tiempoNecesario) {
                    tiempoAcumulado += tiempoNecesario;
                    fraseActual++;
                }
        
                tiempoTranscurrido += 1/30;
                requestAnimationFrame(animar);
            } else {
                actualizarEstado('¡Video completado!');
                mediaRecorder.stop();
            }
        };
        

        animar();

    } catch (error) {
        status.textContent = `Error: ${error.message}`;
        console.error(error);
    }
}




