document.addEventListener('DOMContentLoaded', () => {
    const webcam = document.getElementById('webcam');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    const btnLigar = document.getElementById('ligar');
    const btnDesligar = document.getElementById('desligar');
    const btnCapturar = document.getElementById('capturar');
    const btnLimpar = document.getElementById('limpar');
    const btnDownload = document.getElementById('download');

    const modoFoto = document.getElementById('modo-foto');
    const modoVideo = document.getElementById('modo-video');
    const selectEfeitos = document.getElementById('efeitos');
    const listaAdesivos = document.getElementById('lista-adesivos');

    const feedback = document.getElementById('feedback');
    const previewImagem = document.getElementById('preview-imagem');
    const previewVideo = document.getElementById('preview-video');

    let stream;
    let modoAtual = 'foto';
    let isRecording = false;
    let mediaRecorder;
    let chunks = [];
    let gravacaoUrl = null;
    let adesivoAtual = null;
    let adesivosAplicados = [];

    // --- EMOJIS ---
    const EMOJIS = ['😎', '😂', '❤️', '🤯'];

    function carregarEmojis() {
        listaAdesivos.innerHTML = '';
        EMOJIS.forEach(emoji => {
            const span = document.createElement('span');
            span.textContent = emoji;
            span.classList.add('item-adesivo');
            span.style.fontSize = '40px';
            span.style.cursor = 'pointer';
            span.style.margin = '5px';
            span.addEventListener('click', () => {
                adesivoAtual = emoji;
                document.querySelectorAll('.item-adesivo').forEach(e => e.classList.remove('selected'));
                span.classList.add('selected');
            });
            listaAdesivos.appendChild(span);
        });
    }

    async function ligarCamera() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            webcam.srcObject = stream;
            feedback.textContent = 'Câmera ligada!';
            btnCapturar.disabled = false;
            btnLimpar.disabled = false;
            btnDesligar.disabled = false;
            btnLigar.disabled = true;
            selectEfeitos.disabled = false;
        } catch (err) {
            feedback.textContent = 'Erro ao acessar a câmera.';
            console.error(err);
        }
    }

    function desligarCamera() {
        if (stream) stream.getTracks().forEach(t => t.stop());
        webcam.srcObject = null;
        feedback.textContent = 'Câmera desligada.';
        btnCapturar.disabled = true;
        btnLimpar.disabled = true;
        btnDownload.disabled = true;
        btnDesligar.disabled = true;
        btnLigar.disabled = false;
        selectEfeitos.disabled = true;
        limparTela();
    }

    function aplicarFiltro(ctxTarget) {
        const efeito = selectEfeitos.value;
        ctxTarget.filter = efeito === 'nenhum' ? 'none' :
                           efeito === 'preto-e-branco' ? 'grayscale(100%)' :
                           efeito === 'sepia' ? 'sepia(100%)' :
                           efeito === 'invertido' ? 'invert(100%)' : 'none';
    }

    function tirarFoto() {
        if (!stream) return;

        aplicarFiltro(ctx);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);

        adesivosAplicados.forEach(a => {
            ctx.font = '60px "Segoe UI Emoji", "Arial", sans-serif';
            ctx.fillText(a.emoji, a.x, a.y);
        });

        feedback.textContent = 'Foto capturada!';
        btnDownload.disabled = false;

        previewImagem.src = canvas.toDataURL('image/png');
        previewImagem.style.filter = ctx.filter;
        previewImagem.style.display = 'block';
        previewVideo.style.display = 'none';
    }

    function limparTela() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        adesivosAplicados = [];
        gravacaoUrl = null;
        btnDownload.disabled = true;

        previewImagem.style.display = 'none';
        previewImagem.src = '';
        previewVideo.style.display = 'none';
        previewVideo.src = '';
        feedback.textContent = 'Tela limpa.';
    }

    function baixarConteudo() {
        const a = document.createElement('a');
        if (modoAtual === 'foto' && previewImagem.src) {
            a.href = previewImagem.src;
            a.download = 'foto-emoji.png';
        } else if (modoAtual === 'video' && gravacaoUrl) {
            a.href = gravacaoUrl;
            a.download = 'video-emoji.webm';
        } else {
            feedback.textContent = 'Nenhum conteúdo para baixar!';
            return;
        }
        a.click();
    }

    function atualizarModo() {
        modoAtual = modoFoto.checked ? 'foto' : 'video';
        btnCapturar.textContent = modoAtual === 'foto' ? 'Tirar Foto' : 'Iniciar Gravação';
        adesivosAplicados = [];
        limparTela();
    }

    function colocarAdesivo(e) {
        if (!adesivoAtual || !stream) return;

        const rect = canvas.getBoundingClientRect();
        adesivosAplicados.push({
            emoji: adesivoAtual,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });

        if (modoAtual === 'foto') {
            tirarFoto();
        }
    }

    function iniciarGravacao() {
        if (!stream) return;

        isRecording = true;
        btnCapturar.textContent = 'Parar Gravação';
        feedback.textContent = 'Gravando vídeo...';

        const drawLoop = () => {
            if (!isRecording) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            aplicarFiltro(ctx);
            ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);

            adesivosAplicados.forEach(a => {
                ctx.font = '60px "Segoe UI Emoji", "Arial", sans-serif';
                ctx.fillText(a.emoji, a.x, a.y);
            });

            requestAnimationFrame(drawLoop);
        };
        drawLoop();

        const canvasStream = canvas.captureStream(30);
        mediaRecorder = new MediaRecorder(canvasStream, { mimeType: 'video/webm' });
        chunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            gravacaoUrl = URL.createObjectURL(blob);

            previewVideo.src = gravacaoUrl;
            previewVideo.controls = true;
            previewVideo.style.display = 'block';

            previewImagem.style.display = 'none';
            btnDownload.disabled = false;
            feedback.textContent = 'Gravação finalizada!';
        };

        mediaRecorder.start();
    }

    function pararGravacao() {
        isRecording = false;
        btnCapturar.textContent = 'Iniciar Gravação';
        mediaRecorder.stop();
    }

    // --- EVENTOS ---
    carregarEmojis();
    btnLigar.addEventListener('click', ligarCamera);
    btnDesligar.addEventListener('click', desligarCamera);
    btnLimpar.addEventListener('click', limparTela);
    btnDownload.addEventListener('click', baixarConteudo);
    canvas.addEventListener('click', colocarAdesivo);
    modoFoto.addEventListener('change', atualizarModo);
    modoVideo.addEventListener('change', atualizarModo);

    btnCapturar.addEventListener('click', () => {
        if (modoAtual === 'foto') {
            tirarFoto();
        } else {
            if (!isRecording) {
                iniciarGravacao();
            } else {
                pararGravacao();
            }
        }
    });
});
