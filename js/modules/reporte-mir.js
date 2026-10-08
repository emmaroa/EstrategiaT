document.addEventListener('DOMContentLoaded', () => {
  validarPermiso('Reporte MIR');
  ETLayout.inicializar('Reporte MIR');
  document.getElementById('mirCargar').addEventListener('click',()=>document.getElementById('csvFileInput').click());
  const escMir=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        // --- State Management ---
        let rawData = [];
        let filteredData = [];
        let currentPage = 1;
        const pageSize = 15;

        // Chart instances
        let comparisonChartInstance = null;
        let evModelsChartInstance = null;

        // --- EV Identification Logic ---
        // Matches electric vehicles specifically while filtering stationary generators or non-EVs
        function isElectricVehicle(row) {
            // Find text in relevant columns regardless of exact header casing
            const descCorta = (row['Descripción Corta'] || row['DESCRIPCION CORTA'] || row['Descripcion Corta'] || '').toString().trim();
            const descSol = (row['Descripción Sol. Manto'] || row['DESCRIPCION SOL. MANTO'] || '').toString().trim();

            const fullText = (descCorta + ' ' + descSol).toUpperCase();

            // Explicit Exclusions (Generators or Gas Vehicles)
            if (fullText.includes('PLANTA ELECTRICA') || fullText.includes('GENERADOR')) {
                return false;
            }

            // Keyword patterns for electric vehicles in your fleet
            const evKeywords = [
                'ELECTRICO', 'ELECTRICA', 'DOLPHIN', 'E10X', 
                'ESEI', 'E-SEI', 'EFRISON', 'S12-EV', 
                'DULEVO', 'BARREDORA ELECTRICA', 'EJ7', 'EV '
            ];

            return evKeywords.some(keyword => fullText.includes(keyword));
        }

        // --- DOM Elements ---
        const csvFileInput = document.getElementById('csvFileInput');
        const dropzoneContainer = document.getElementById('dropzoneContainer');
        const dashboardSection = document.getElementById('dashboardSection');
        const fileInfo = document.getElementById('fileInfo');

        const searchInput = document.getElementById('searchInput');
        const dependenciaFilter = document.getElementById('dependenciaFilter');
        const tipoMantoFilter = document.getElementById('tipoMantoFilter');
        const resetFiltersBtn = document.getElementById('resetFiltersBtn');

        // File Selection Handlers
        csvFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) processCSVFile(e.target.files[0]);
        });

        dropzoneContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzoneContainer.classList.add('mir-dragging');
        });

        dropzoneContainer.addEventListener('dragleave', () => {
            dropzoneContainer.classList.remove('mir-dragging');
        });

        dropzoneContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzoneContainer.classList.remove('mir-dragging');
            if (e.dataTransfer.files.length > 0) processCSVFile(e.dataTransfer.files[0]);
        });

        // Parse CSV with PapaParse
        function processCSVFile(file) {
            if(!/\.csv$/i.test(file.name))return alert('Selecciona un archivo CSV.');
            if(file.size>20*1024*1024)return alert('El CSV debe ser menor a 20 MB.');
            currentPage=1;
            searchInput.value='';
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                transformHeader: function(header) {
                    // Clean BOM characters and whitespace from headers
                    return header.replace(/^\ufeff/, '').trim();
                },
                complete: function(results) {
                    if (results.data && results.data.length > 0) {
                        rawData = results.data.map(row => ({
                            ...row,
                            _isEV: isElectricVehicle(row)
                        }));

                        // Update header file info
                        document.getElementById('fileName').innerText = file.name;
                        document.getElementById('fileRows').innerText = `(${rawData.length.toLocaleString()} filas)`;
                        fileInfo.classList.remove('hidden');

                        // Build filter options & show dashboard
                        populateFilterDropdowns();
                        applyFilters();

                        dropzoneContainer.classList.add('hidden');
                        dashboardSection.classList.remove('hidden');
                    } else {
                        alert('El archivo CSV parece estar vacío o con un formato no compatible.');
                    }
                },
                error: function(err) {
                    alert('Error al leer el archivo CSV: ' + err.message);
                }
            });
        }

        // Populate Dropdown Options dynamically
        function populateFilterDropdowns() {
            const dependencias = new Set();
            const tiposManto = new Set();

            rawData.forEach(r => {
                const dep = r['Dependencia'] || r['DEPENDENCIA'];
                const tipo = r['Tipo Manto'] || r['TIPO MANTO'];
                if (dep) dependencias.add(dep.trim());
                if (tipo) tiposManto.add(tipo.trim());
            });

            // Populate Dependencias
            dependenciaFilter.innerHTML = '<option value="TODAS">Todas las Dependencias</option>';
            Array.from(dependencias).sort().forEach(dep => {
                const opt = document.createElement('option');
                opt.value = dep;
                opt.textContent = dep;
                dependenciaFilter.appendChild(opt);
            });

            // Populate Tipos Manto
            tipoMantoFilter.innerHTML = '<option value="TODOS">Todos los Tipos</option>';
            Array.from(tiposManto).sort().forEach(tipo => {
                const opt = document.createElement('option');
                opt.value = tipo;
                opt.textContent = tipo;
                tipoMantoFilter.appendChild(opt);
            });
        }

        // Filter Event Listeners
        searchInput.addEventListener('input', () => { currentPage = 1; applyFilters(); });
        dependenciaFilter.addEventListener('change', () => { currentPage = 1; applyFilters(); });
        tipoMantoFilter.addEventListener('change', () => { currentPage = 1; applyFilters(); });

        resetFiltersBtn.addEventListener('click', () => {
            searchInput.value = '';
            dependenciaFilter.value = 'TODAS';
            tipoMantoFilter.value = 'TODOS';
            currentPage = 1;
            applyFilters();
        });

        // Apply Filters
        function applyFilters() {
            const searchVal = searchInput.value.toLowerCase().trim();
            const depVal = dependenciaFilter.value;
            const tipoVal = tipoMantoFilter.value;

            filteredData = rawData.filter(row => {
                // Dependencia match
                if (depVal !== 'TODAS' && (row['Dependencia'] || '').trim() !== depVal) return false;
                
                // Tipo Manto match
                if (tipoVal !== 'TODOS' && (row['Tipo Manto'] || '').trim() !== tipoVal) return false;

                // Search keyword match
                if (searchVal) {
                    const rowText = Object.values(row).join(' ').toLowerCase();
                    if (!rowText.includes(searchVal)) return false;
                }

                return true;
            });

            updateMetricsAndCharts();
            renderTable();
        }

        // Calculate Unique Folios and Metrics
        function updateMetricsAndCharts() {
            // Helper for counting unique Folio Sol. Manto
            function getStats(dataset) {
                const allFolios = new Set();
                const completedFolios = new Set();
                let partidasCount = dataset.length;
                let completedPartidas = 0;

                dataset.forEach(r => {
                    const folioSol = (r['Folio Sol. Manto'] || r['FOLIO SOL. MANTO'] || '').toString().trim();
                    const folioOrden = (r['Folio Orden'] || r['FOLIO ORDEN'] || '').toString().trim();

                    if (folioSol) {
                        allFolios.add(folioSol);
                        if (folioOrden && folioOrden !== '0' && folioOrden !== 'NaN') {
                            completedFolios.add(folioSol);
                        }
                    }

                    if (folioOrden && folioOrden !== '0' && folioOrden !== 'NaN') {
                        completedPartidas++;
                    }
                });

                return {
                    uniqueFolios: allFolios.size,
                    completedFolios: completedFolios.size,
                    totalPartidas: partidasCount,
                    completedPartidas: completedPartidas
                };
            }

            const totalStats = getStats(filteredData);
            const evData = filteredData.filter(r => r._isEV);
            const evStats = getStats(evData);

            const combData = filteredData.filter(r => !r._isEV);
            const combStats = getStats(combData);

            // Render Cards Info
            document.getElementById('cardTotalFolios').innerText = totalStats.uniqueFolios.toLocaleString();
            document.getElementById('cardTotalPartidas').innerText = `(${totalStats.totalPartidas.toLocaleString()} partidas de servicio)`;
            document.getElementById('cardTotalAtendidos').innerText = totalStats.completedFolios.toLocaleString();
            const totalPct = totalStats.uniqueFolios ? ((totalStats.completedFolios / totalStats.uniqueFolios) * 100).toFixed(1) : 0;
            document.getElementById('cardTotalPct').innerText = `${totalPct}% cumplido`;

            document.getElementById('cardEvFolios').innerText = evStats.uniqueFolios.toLocaleString();
            document.getElementById('cardEvPartidas').innerText = `(${evStats.totalPartidas.toLocaleString()} partidas de servicio)`;
            document.getElementById('cardEvAtendidos').innerText = evStats.completedFolios.toLocaleString();
            const evPct = evStats.uniqueFolios ? ((evStats.completedFolios / evStats.uniqueFolios) * 100).toFixed(1) : 0;
            document.getElementById('cardEvPct').innerText = `${evPct}% cumplido`;

            document.getElementById('cardCombFolios').innerText = combStats.uniqueFolios.toLocaleString();
            document.getElementById('cardCombPartidas').innerText = `(${combStats.totalPartidas.toLocaleString()} partidas de servicio)`;
            document.getElementById('cardCombAtendidos').innerText = combStats.completedFolios.toLocaleString();
            const combPct = combStats.uniqueFolios ? ((combStats.completedFolios / combStats.uniqueFolios) * 100).toFixed(1) : 0;
            document.getElementById('cardCombPct').innerText = `${combPct}% cumplido`;

            // Update Charts
            renderCharts(evStats, combStats, evData);
        }

        // Render Chart.js
        function renderCharts(evStats, combStats, evData) {
            // Chart 1: Comparison
            const ctx1 = document.getElementById('chartComparison').getContext('2d');
            if (comparisonChartInstance) comparisonChartInstance.destroy();

            comparisonChartInstance = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: ['Unidades Eléctricas', 'Combustión / No Eléctricas'],
                    datasets: [
                        {
                            label: 'Folios Programados (Solicitados)',
                            data: [evStats.uniqueFolios, combStats.uniqueFolios],
                            backgroundColor: ['rgba(16, 185, 129, 0.3)', 'rgba(59, 130, 246, 0.3)'],
                            borderColor: ['#07b1bc', '#fc712b'],
                            borderWidth: 2,
                            borderRadius: 6
                        },
                        {
                            label: 'Folios Realizados (Con Orden)',
                            data: [evStats.completedFolios, combStats.completedFolios],
                            backgroundColor: ['#07b1bc', '#fc712b'],
                            borderRadius: 6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });

            // Chart 2: Top EV Models
            const ctx2 = document.getElementById('chartEvModels').getContext('2d');
            if (evModelsChartInstance) evModelsChartInstance.destroy();

            // Count EV occurrences by model name
            const modelCounts = {};
            evData.forEach(r => {
                const model = (r['Descripción Corta'] || 'SIN ESPECIFICAR').toString().trim();
                modelCounts[model] = (modelCounts[model] || 0) + 1;
            });

            const sortedModels = Object.entries(modelCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6);

            evModelsChartInstance = new Chart(ctx2, {
                type: 'doughnut',
                data: {
                    labels: sortedModels.map(m => m[0]),
                    datasets: [{
                        data: sortedModels.map(m => m[1]),
                        backgroundColor: [
                            '#07b1bc', '#087e85', '#34d399', 
                            '#0284c7', '#06b6d4', '#6366f1'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 } } }
                    }
                }
            });
        }

        // Render Table Data
        function renderTable() {
            const tableBody = document.getElementById('tableBody');
            document.getElementById('tableRecordCount').innerText = `${filteredData.length.toLocaleString()} partidas`;

            const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
            if (currentPage > totalPages) currentPage = totalPages;

            const startIndex = (currentPage - 1) * pageSize;
            const pageData = filteredData.slice(startIndex, startIndex + pageSize);

            tableBody.innerHTML = '';

            if (pageData.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400">No se encontraron registros que coincidan con los filtros.</td></tr>`;
            } else {
                pageData.forEach(row => {
                    const tr = document.createElement('tr');
                    tr.className = 'mir-row';

                    const isEV = row._isEV;
                    const badge = isEV 
                        ? `<span class="mir-badge mir-electric">Eléctrico</span>`
                        : `<span class="mir-badge">Combustión</span>`;

                    tr.innerHTML = `
                        <td >${badge}</td>
                        <td >${escMir(row['Folio Sol. Manto'] || '-')}</td>
                        <td >${escMir(row['Folio Orden']) || '<span class="mir-badge mir-pending">Pendiente</span>'}</td>
                        <td >${escMir(row['Descripción Corta'] || '-')}</td>
                        <td >${escMir(row['Dependencia'] || '-')}</td>
                        <td >${escMir(row['Tipo Manto'] || '-')}</td>
                        <td >$${Number(row['Costo Total'] || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                    `;
                    tableBody.appendChild(tr);
                });
            }

            // Pagination Controls
            document.getElementById('paginationInfo').innerText = `Página ${currentPage} de ${totalPages}`;
            document.getElementById('prevPageBtn').disabled = (currentPage === 1);
            document.getElementById('nextPageBtn').disabled = (currentPage === totalPages);
        }

        document.getElementById('prevPageBtn').addEventListener('click', () => {
            if (currentPage > 1) { currentPage--; renderTable(); }
        });

        document.getElementById('nextPageBtn').addEventListener('click', () => {
            const totalPages = Math.ceil(filteredData.length / pageSize);
            if (currentPage < totalPages) { currentPage++; renderTable(); }
        });

        // Export Filtered Table to CSV
        document.getElementById('exportCsvBtn').addEventListener('click', async () => {
            if (filteredData.length === 0) return alert('No hay datos para exportar.');
            
            const exportData = filteredData.map(r => {
                const cleaned = { ...r };
                delete cleaned._isEV;
                cleaned['Es Eléctrico'] = r._isEV ? 'SI' : 'NO';
                return cleaned;
            });

            const headers=Object.keys(exportData[0]);
            const selected=await ETTableColumns.selectExport(headers,'reporte-mir',document.getElementById('tablaReporteMir'));
            if(!selected)return;
            const csv = Papa.unparse({fields:selected.map(i=>headers[i]),data:exportData.map(row=>selected.map(i=>row[headers[i]]??''))}, {escapeFormulae:true});
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', 'Reporte_Mantenimiento_Filtrado.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(()=>URL.revokeObjectURL(link.href),1000);
        });

});
