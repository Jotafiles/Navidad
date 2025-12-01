const SUPABASE_URL = 'https://knndwpjroknubizzgbmj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtubmR3cGpyb2tudWJpenpnYm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MDczNDQsImV4cCI6MjA3OTk4MzM0NH0.DjAMlxRCoVsOQptFa7hfj4rRx_eu1yOXiM4YSCbZ-Y0';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const state = {
    currentSection: 'personas',
    currentPersonaId: null,
    currentPersona: null,
    personas: [],
    ideas: [],
    deleteTarget: null
};

function init() {
    initTheme();
    setupEventListeners();
    loadPersonas();
    subscribeToChanges();
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const btnTheme = document.getElementById('btn-theme');
    
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        btnTheme.textContent = '☀️';
    } else {
        document.documentElement.removeAttribute('data-theme');
        btnTheme.textContent = '🌙';
    }
}

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const btnTheme = document.getElementById('btn-theme');
    
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        btnTheme.textContent = '🌙';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        btnTheme.textContent = '☀️';
    }
}

function setupEventListeners() {
    document.getElementById('btn-theme').addEventListener('click', toggleTheme);
    document.getElementById('btn-back-personas').addEventListener('click', () => showSection('personas'));

    document.getElementById('btn-add-persona').addEventListener('click', () => openModalPersona());
    document.getElementById('btn-add-persona-empty').addEventListener('click', () => openModalPersona());
    document.getElementById('btn-add-idea').addEventListener('click', () => openModalIdea());
    document.getElementById('btn-add-idea-empty').addEventListener('click', () => openModalIdea());

    document.querySelectorAll('.modal-close, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.modal));
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) closeModal(modal.id);
        });
    });

    document.getElementById('form-persona').addEventListener('submit', handleSubmitPersona);
    document.getElementById('form-idea').addEventListener('submit', handleSubmitIdea);

    document.getElementById('btn-confirm-delete').addEventListener('click', handleConfirmDelete);
}

function showSection(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${section}`).classList.add('active');
    state.currentSection = section;
}

function showIdeasPersona(personaId) {
    state.currentPersonaId = personaId;
    state.currentPersona = state.personas.find(p => p.id === personaId);
    
    if (state.currentPersona) {
        document.getElementById('titulo-ideas').textContent = `Ideas para ${state.currentPersona.nombre}`;
        renderPersonaInfo();
    }
    
    loadIdeas(personaId);
    showSection('ideas');
}

function renderPersonaInfo() {
    const container = document.getElementById('persona-info');
    const p = state.currentPersona;
    
    if (!p) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="persona-info-header">
            <div>
                <div class="persona-info-name">${p.nombre}</div>
                ${p.presupuesto ? `<div class="persona-info-budget">Presupuesto: ${p.presupuesto}</div>` : ''}
            </div>
        </div>
        ${p.gustos ? `<div class="persona-info-gustos">${p.gustos}</div>` : ''}
    `;
}

async function loadPersonas() {
    const { data, error } = await supabase
        .from('personas')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        showToast('Error al cargar personas');
        return;
    }

    state.personas = data || [];
    renderPersonas();
}

async function loadIdeas(personaId) {
    const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .eq('persona_id', personaId)
        .order('created_at', { ascending: true });

    if (error) {
        showToast('Error al cargar ideas');
        return;
    }

    state.ideas = data || [];
    renderIdeas();
}

function renderPersonas() {
    const grid = document.getElementById('grid-personas');
    const empty = document.getElementById('empty-personas');

    if (state.personas.length === 0) {
        grid.innerHTML = '';
        empty.classList.add('visible');
        return;
    }

    empty.classList.remove('visible');

    grid.innerHTML = state.personas.map(p => {
        return `
            <div class="card" data-id="${p.id}">
                <div class="card-header">
                    <div class="card-info">
                        <div class="card-name">${p.nombre}</div>
                        ${p.presupuesto ? `<div class="card-meta">${p.presupuesto}</div>` : ''}
                    </div>
                </div>
                ${p.gustos ? `<div class="card-description">${p.gustos}</div>` : ''}
                <div class="card-actions">
                    <button class="btn-card btn-ver" onclick="showIdeasPersona('${p.id}')">Ver ideas</button>
                    <button class="btn-card btn-editar" onclick="editPersona('${p.id}')">Editar</button>
                    <button class="btn-card btn-eliminar" onclick="confirmDelete('persona', '${p.id}')">🗑</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderIdeas() {
    const grid = document.getElementById('grid-ideas');
    const empty = document.getElementById('empty-ideas');

    if (state.ideas.length === 0) {
        grid.innerHTML = '';
        empty.classList.add('visible');
        return;
    }

    empty.classList.remove('visible');

    grid.innerHTML = state.ideas.map(idea => {
        const estadoClass = idea.estado.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        return `
            <div class="card" data-id="${idea.id}">
                <div class="card-name" style="margin-bottom: 8px;">${idea.nombre}</div>
                ${idea.descripcion ? `<div class="card-description">${idea.descripcion}</div>` : ''}
                <div class="card-row">
                    ${idea.precio ? `<span class="card-price">${idea.precio}</span>` : ''}
                    ${idea.link ? `<a href="${idea.link}" target="_blank" class="card-link">Ver en tienda ↗</a>` : ''}
                </div>
                <div class="card-row">
                    <select class="estado-select ${estadoClass}" onchange="updateIdeaEstado('${idea.id}', this.value)">
                        <option value="Idea" ${idea.estado === 'Idea' ? 'selected' : ''}>Idea</option>
                        <option value="Elegida" ${idea.estado === 'Elegida' ? 'selected' : ''}>Elegida</option>
                        <option value="Comprada" ${idea.estado === 'Comprada' ? 'selected' : ''}>Comprada</option>
                        <option value="Envuelta" ${idea.estado === 'Envuelta' ? 'selected' : ''}>Envuelta</option>
                        <option value="Entregada" ${idea.estado === 'Entregada' ? 'selected' : ''}>Entregada</option>
                    </select>
                </div>
                ${idea.propuesto_por ? `<div class="card-detail">Propuso: ${idea.propuesto_por}</div>` : ''}
                ${idea.responsable ? `<div class="card-detail">Responsable: ${idea.responsable}</div>` : ''}
                <div class="card-actions">
                    <button class="btn-card btn-editar" onclick="editIdea('${idea.id}')">Editar</button>
                    <button class="btn-card btn-eliminar" onclick="confirmDelete('idea', '${idea.id}')">🗑</button>
                </div>
            </div>
        `;
    }).join('');
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function openModalPersona(persona = null) {
    const modal = document.getElementById('modal-persona');
    const title = document.getElementById('modal-persona-titulo');
    const form = document.getElementById('form-persona');

    form.reset();
    document.getElementById('persona-id').value = '';

    if (persona) {
        title.textContent = 'Editar Persona';
        document.getElementById('persona-id').value = persona.id;
        document.getElementById('persona-nombre').value = persona.nombre || '';
        document.getElementById('persona-presupuesto').value = persona.presupuesto || '';
        document.getElementById('persona-gustos').value = persona.gustos || '';
    } else {
        title.textContent = 'Agregar Persona';
    }

    openModal('modal-persona');
}

function openModalIdea(idea = null) {
    const modal = document.getElementById('modal-idea');
    const title = document.getElementById('modal-idea-titulo');
    const form = document.getElementById('form-idea');

    form.reset();
    document.getElementById('idea-id').value = '';
    document.getElementById('idea-persona-id').value = state.currentPersonaId;

    if (idea) {
        title.textContent = 'Editar Idea';
        document.getElementById('idea-id').value = idea.id;
        document.getElementById('idea-nombre').value = idea.nombre || '';
        document.getElementById('idea-descripcion').value = idea.descripcion || '';
        document.getElementById('idea-precio').value = idea.precio || '';
        document.getElementById('idea-link').value = idea.link || '';
        document.getElementById('idea-propuesto').value = idea.propuesto_por || '';
        document.getElementById('idea-responsable').value = idea.responsable || '';
        document.getElementById('idea-estado').value = idea.estado || 'Idea';
    } else {
        title.textContent = 'Agregar Idea';
    }

    openModal('modal-idea');
}

async function handleSubmitPersona(e) {
    e.preventDefault();

    const id = document.getElementById('persona-id').value;
    const data = {
        nombre: document.getElementById('persona-nombre').value.trim(),
        presupuesto: document.getElementById('persona-presupuesto').value.trim() || null,
        gustos: document.getElementById('persona-gustos').value.trim() || null
    };

    if (!data.nombre) {
        showToast('El nombre es requerido');
        return;
    }

    let error;

    if (id) {
        const result = await supabase.from('personas').update(data).eq('id', id);
        error = result.error;
    } else {
        const result = await supabase.from('personas').insert([data]);
        error = result.error;
    }

    if (error) {
        showToast('Error al guardar');
        return;
    }

    closeModal('modal-persona');
    showToast(id ? 'Persona actualizada' : 'Persona agregada');
}

async function handleSubmitIdea(e) {
    e.preventDefault();

    const id = document.getElementById('idea-id').value;
    const personaId = document.getElementById('idea-persona-id').value;
    
    const data = {
        persona_id: personaId,
        nombre: document.getElementById('idea-nombre').value.trim(),
        descripcion: document.getElementById('idea-descripcion').value.trim() || null,
        precio: document.getElementById('idea-precio').value.trim() || null,
        link: document.getElementById('idea-link').value.trim() || null,
        propuesto_por: document.getElementById('idea-propuesto').value.trim() || null,
        responsable: document.getElementById('idea-responsable').value.trim() || null,
        estado: document.getElementById('idea-estado').value
    };

    if (!data.nombre) {
        showToast('El nombre es requerido');
        return;
    }

    let error;

    if (id) {
        const result = await supabase.from('ideas').update(data).eq('id', id);
        error = result.error;
    } else {
        const result = await supabase.from('ideas').insert([data]);
        error = result.error;
    }

    if (error) {
        showToast('Error al guardar');
        return;
    }

    closeModal('modal-idea');
    showToast(id ? 'Idea actualizada' : 'Idea agregada');
}

function editPersona(id) {
    const persona = state.personas.find(p => p.id === id);
    if (persona) openModalPersona(persona);
}

function editIdea(id) {
    const idea = state.ideas.find(i => i.id === id);
    if (idea) openModalIdea(idea);
}

function confirmDelete(type, id) {
    state.deleteTarget = { type, id };
    
    const messages = {
        persona: '¿Eliminar esta persona? También se eliminarán todas sus ideas.',
        idea: '¿Eliminar esta idea?'
    };
    
    document.getElementById('confirm-message').textContent = messages[type];
    openModal('modal-confirm');
}

async function handleConfirmDelete() {
    if (!state.deleteTarget) return;

    const { type, id } = state.deleteTarget;
    let error;

    if (type === 'persona') {
        const result = await supabase.from('personas').delete().eq('id', id);
        error = result.error;
    } else if (type === 'idea') {
        const result = await supabase.from('ideas').delete().eq('id', id);
        error = result.error;
    }

    if (error) {
        showToast('Error al eliminar');
    } else {
        showToast('Eliminado');
    }

    state.deleteTarget = null;
    closeModal('modal-confirm');
}

async function updateIdeaEstado(id, estado) {
    const { error } = await supabase.from('ideas').update({ estado }).eq('id', id);
    if (error) showToast('Error al actualizar');
}

function subscribeToChanges() {
    supabase
        .channel('personas-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'personas' }, () => {
            loadPersonas();
        })
        .subscribe();

    supabase
        .channel('ideas-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ideas' }, (payload) => {
            if (state.currentPersonaId && state.currentSection === 'ideas') {
                if (payload.new?.persona_id === state.currentPersonaId || 
                    payload.old?.persona_id === state.currentPersonaId) {
                    loadIdeas(state.currentPersonaId);
                }
            }
        })
        .subscribe();
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('visible');
    
    setTimeout(() => {
        toast.classList.remove('visible');
    }, 2500);
}

document.addEventListener('DOMContentLoaded', init);
