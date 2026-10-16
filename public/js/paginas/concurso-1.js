const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const currentMonthDisplay = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

        let selectedMonth = currentMonth;
        let availableMonths = [];

        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('month-display').innerText = currentMonthDisplay;
            
            if (isLoggedIn()) {
                document.getElementById('upload-section').classList.remove('hidden');
                document.getElementById('login-prompt').classList.add('hidden');
            }

            loadAvailableMonths();
            loadContestEntries(currentMonth);
            setupUpload();
            if (typeof enableTagging === 'function') {
                enableTagging('description');
            }
        });

        async function loadAvailableMonths() {
            try {
                const res = await fetch(`${CONFIG.API_URL}/posts/contest/months`);
                if (!res.ok) throw new Error();
                availableMonths = await res.json();
                
                // Poblar selector
                const selector = document.getElementById('month-selector');
                selector.innerHTML = '<option value="">Seleccioná un mes...</option>';
                availableMonths.forEach(m => {
                    const [y, mo] = m.split('-');
                    const label = `${monthNames[parseInt(mo)-1]} ${y}`;
                    const opt = document.createElement('option');
                    opt.value = m;
                    opt.textContent = label;
                    if (m === currentMonth) opt.selected = true;
                    selector.appendChild(opt);
                });
                
                updateNavButtons();
            } catch (e) {
                console.warn('No se pudieron cargar los meses disponibles:', e);
            }
        }

        function updateNavButtons() {
            const prevBtn = document.getElementById('prev-month-btn');
            const nextBtn = document.getElementById('next-month-btn');
            const idx = availableMonths.indexOf(selectedMonth);
            prevBtn.disabled = idx >= availableMonths.length - 1;
            nextBtn.disabled = idx <= 0;
        }

        function navigateMonth(direction) {
            const idx = availableMonths.indexOf(selectedMonth);
            const target = idx + direction;
            if (target < 0 || target >= availableMonths.length) return;
            jumpToMonth(availableMonths[target]);
        }

        function jumpToMonth(month) {
            if (!month) return;
            selectedMonth = month;
            const [y, mo] = month.split('-');
            const label = `${monthNames[parseInt(mo)-1]} ${y}`;
            document.getElementById('month-display').innerText = label;
            document.getElementById('month-selector').value = month;
            
            // Ocultar upload section si no es el mes actual
            const isCurrent = month === currentMonth;
            document.getElementById('upload-section').classList.toggle('hidden', !isCurrent || !isLoggedIn());
            if (!isCurrent) {
                document.getElementById('login-prompt').classList.add('hidden');
            } else if (!isLoggedIn()) {
                document.getElementById('login-prompt').classList.remove('hidden');
            }
            
            updateNavButtons();
            loadContestEntries(month);
        }

        async function loadContestEntries(month) {
            const container = document.getElementById('contest-container');
            try {
                const res = await fetch(`${CONFIG.API_URL}/posts/contest/${month}`);
                if (!res.ok) throw new Error();
                const entries = await res.json();
                renderEntries(entries);
            } catch (err) {
                container.innerHTML = `
                    <div class="col-span-full text-center text-red-400 py-10 bg-red-500/5 rounded-3xl border border-red-500/20">
                        <i class="fas fa-exclamation-triangle text-3xl mb-4"></i>
                        <p class="font-bold">Error al cargar las obras. Por favor intenta de nuevo.</p>
                    </div>`;
            }
        }

        function renderEntries(entries) {
            const container = document.getElementById('contest-container');
            if (entries.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full text-center py-32 px-10 rounded-[3rem] border border-dashed border-white/10 bg-white/5 group hover:border-yellow-500/30 transition-all duration-700">
                        <div class="w-24 h-24 rounded-[2rem] bg-white/5 flex items-center justify-center mx-auto mb-8 border border-white/5 group-hover:scale-110 transition-transform">
                            <i class="fas fa-palette text-5xl text-gray-700 group-hover:text-yellow-500/50 transition-colors"></i>
                        </div>
                        <h3 class="text-2xl font-black text-white mb-2 uppercase tracking-tight">¡No hay participantes todavía!</h3>
                        <p class="text-gray-500 text-lg">Sé el primero en subir tu obra y empezá a sumar votos.</p>
                    </div>`;
                return;
            }

            // Ordenar por votos
            entries.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));

            container.innerHTML = entries.map((entry, index) => {
                const isTop = index < 3;
                const badgeColor = index === 0 ? 'bg-yellow-500' : (index === 1 ? 'bg-gray-300' : (index === 2 ? 'bg-orange-500' : 'bg-white/10'));
                const icon = index === 0 ? 'fa-crown' : (index === 1 ? 'fa-medal' : (index === 2 ? 'fa-award' : 'fa-check'));

                return `
                    <div class="group rounded-[2.5rem] overflow-hidden border border-white/5 bg-[#0d0d12]/60 hover:bg-[#0d0d12]/80 backdrop-blur-xl transition-all duration-500 hover:border-yellow-500/30 hover:shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col h-full card-cyber relative">
                        <!-- Ranking Badge -->
                        <div class="absolute top-4 left-4 z-20 flex items-center gap-2">
                            <div class="${badgeColor} text-black w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transform -rotate-12 group-hover:rotate-0 transition-transform duration-500">
                                <i class="fas ${icon} text-lg"></i>
                            </div>
                            ${index === 0 ? '<span class="bg-yellow-500/20 text-yellow-500 text-[10px] font-black px-3 py-1 rounded-lg border border-yellow-500/30 backdrop-blur-md uppercase tracking-widest">Liderando</span>' : ''}
                        </div>

                        <!-- Image Container -->
                        <div class="relative aspect-square overflow-hidden cursor-pointer" onclick="window.location.href='post.html?id=${entry._id}'">
                            <img src="${sanitizeUrl(entry.imageUrl)}" alt="${escapeHTML(entry.title)}" class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110">
                            <div class="absolute inset-0 bg-gradient-to-t from-[#0d0d12] via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-500"></div>
                            
                            <!-- Quick Info Overlay -->
                            <div class="absolute inset-x-0 bottom-0 p-8 transform translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
                                <h4 class="text-xl font-black text-white mb-1 line-clamp-1">${escapeHTML(entry.title)}</h4>
                                <div class="flex items-center gap-3">
                                    <div class="w-6 h-6 rounded-lg overflow-hidden border border-white/20">
                                        <img src="${sanitizeUrl(entry.author?.avatar) || 'img/artedigital.png'}" class="w-full h-full object-cover">
                                    </div>
                                    <span class="text-xs font-bold text-gray-300 uppercase tracking-widest">${escapeHTML(entry.author?.username || 'Anónimo')}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Interaction Footer -->
                        <div class="p-6 mt-auto border-t border-white/5 flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <button onclick="toggleLike('${entry._id}', this)" class="group/like flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 hover:border-red-500/50 hover:bg-red-500/10 transition-all ${entry.likes?.includes(getUserId()) ? 'text-red-500 border-red-500/30 bg-red-500/10' : 'text-gray-400'}">
                                    <i class="${entry.likes?.includes(getUserId()) ? 'fas' : 'far'} fa-heart group-hover/like:scale-125 transition-transform"></i>
                                    <span class="text-sm font-black tracking-tight">${entry.likes?.length || 0}</span>
                                </button>
                                <a href="post.html?id=${entry._id}" class="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-cyan-400 hover:border-cyan-500/50 transition-all">
                                    <i class="fas fa-comment-alt text-sm"></i>
                                </a>
                            </div>
                            <a href="post.html?id=${entry._id}" class="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] hover:text-yellow-500 transition-colors">
                                Detalles <i class="fas fa-chevron-right ml-1"></i>
                            </a>
                        </div>
                    </div>
                `;
            }).join('');
        }

        let cropper;
        let currentFile;
        let rotation = 0;

        function setupUpload() {
            const dropZone = document.getElementById('drop-zone');
            const fileInput = document.getElementById('file-input');
            const previewContainer = document.getElementById('preview-container');
            const previewImg = document.getElementById('preview-img');
            const uploadPrompt = document.getElementById('upload-prompt');
            const removeFileBtn = document.getElementById('remove-file');
            const rotateLeftBtn = document.getElementById('rotate-left');
            const rotateRightBtn = document.getElementById('rotate-right');
            const cropButton = document.getElementById('crop-button');
            const form = document.getElementById('contest-form');

            const handleFile = (file) => {
                if (file && file.type.startsWith('image/')) {
                    currentFile = file;
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        previewImg.src = e.target.result;
                        previewContainer.classList.remove('hidden');
                        uploadPrompt.classList.add('hidden');

                        if (cropper) {
                            cropper.destroy();
                        }
                        cropper = new Cropper(previewImg, {
                            aspectRatio: 1, // Puedes ajustar esto según tus necesidades
                            viewMode: 1,
                            autoCropArea: 0.8,
                            background: false,
                            responsive: true,
                            ready() {
                                // Puedes hacer algo cuando Cropper.js esté listo
                            },
                        });
                    };
                    reader.readAsDataURL(file);
                } else {
                    alert('Por favor, selecciona un archivo de imagen válido.');
                }
            };

            fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('border-yellow-500', 'bg-yellow-500/5');
            });

            ['dragleave', 'drop'].forEach(evt => {
                dropZone.addEventListener(evt, () => {
                    dropZone.classList.remove('border-yellow-500', 'bg-yellow-500/5');
                });
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                handleFile(e.dataTransfer.files[0]);
            });

            removeFileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileInput.value = '';
                currentFile = null;
                if (cropper) {
                    cropper.destroy();
                    cropper = null;
                }
                rotation = 0;
                previewContainer.classList.add('hidden');
                uploadPrompt.classList.remove('hidden');
            });

            rotateLeftBtn.addEventListener('click', () => {
                if (cropper) {
                    cropper.rotate(-90);
                    rotation = (rotation - 90) % 360;
                }
            });

            rotateRightBtn.addEventListener('click', () => {
                if (cropper) {
                    cropper.rotate(90);
                    rotation = (rotation + 90) % 360;
                }
            });

            cropButton.addEventListener('click', () => {
                if (cropper) {
                    // Aquí puedes decidir si quieres aplicar el recorte inmediatamente
                    // o si quieres que el usuario confirme.
                    // Por ahora, simplemente lo aplicaremos al enviar.
                    alert('El recorte se aplicará al subir la imagen.');
                }
            });

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const title = document.getElementById('title').value;
                const description = document.getElementById('description').value;
                
                if (!currentFile) return alert('Por favor selecciona una imagen');

                const btn = document.getElementById('submit-btn');
                const originalText = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>SUBIENDO A LA RED...';

                try {
                    // Obtener la imagen recortada y rotada del Cropper
                    const croppedCanvas = cropper.getCroppedCanvas();
                    const processedBlob = await new Promise(resolve => {
                        croppedCanvas.toBlob(resolve, currentFile.type);
                    });

                    // 1. Subir imagen
                    const formData = new FormData();
                    formData.append('file', processedBlob, currentFile.name);
                    formData.append('rotate', rotation.toString());
                    formData.append('crop', JSON.stringify(cropper.getData())); // Enviar datos de recorte

                    const uploadRes = await apiRequest('/upload', {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!uploadRes || !uploadRes.ok) {
                        const errData = await uploadRes.json().catch(() => ({}));
                        throw new Error(errData.error || 'Error al conectar con el servidor de archivos.');
                    }
                    const uploadData = await uploadRes.json();

                    // 2. Crear Post del Concurso
                    const postRes = await apiRequest('/posts', {
                        method: 'POST',
                        body: JSON.stringify({
                            title,
                            description,
                            imageUrl: uploadData.url,
                            isContest: true,
                            contestMonth: currentMonth,
                            tags: ['concurso', currentMonth]
                        })
                    });

                    if (!postRes || !postRes.ok) throw new Error('Error al registrar tu participación.');

                    // Success
                    btn.innerHTML = '<i class="fas fa-check mr-2"></i>¡OBRA PUBLICADA!';
                    btn.classList.remove('from-yellow-500', 'to-yellow-600');
                    btn.classList.add('from-green-500', 'to-emerald-600');
                    
                    setTimeout(() => {
                        location.reload();
                    }, 1500);

                } catch (err) {
                    console.error(err);
                    alert(err.message);
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            });
        }

        async function toggleLike(id, btn) {
            if (!isLoggedIn()) {
                showLogin();
                return;
            }
            
            // Animación inmediata local
            const icon = btn.querySelector('i');
            const count = btn.querySelector('span');
            const wasLiked = icon.classList.contains('fas');
            
            icon.classList.toggle('fas');
            icon.classList.toggle('far');
            count.innerText = parseInt(count.innerText) + (wasLiked ? -1 : 1);
            btn.classList.toggle('text-red-500');
            btn.classList.toggle('bg-red-500/10');
            btn.classList.toggle('border-red-500/30');

            try {
                const res = await apiRequest(`/posts/${id}/like`, { method: 'POST' });
                if (res && res.ok) {
                    const data = await res.json();
                    count.innerText = data.likes.length;
                    // Sincronizar estado final
                    const isLiked = data.likes.includes(getUserId());
                    if (isLiked) {
                        icon.className = 'fas fa-heart group-hover/like:scale-125 transition-transform';
                        btn.className = 'group/like flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 transition-all';
                    } else {
                        icon.className = 'far fa-heart group-hover/like:scale-125 transition-transform';
                        btn.className = 'group/like flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-gray-400 transition-all';
                    }
                }
            } catch (err) {
                console.error(err);
            }
        }
