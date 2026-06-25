<!-- src/layouts/MainLayout.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { authService } from '../services/auth.service';
import { useRouter, RouterView, RouterLink } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import { useToast } from '../composables/useToast';
import {
  LayoutDashboard, Receipt, Package, Users, ShoppingCart, Wallet, Menu, Power,
  Truck, FileMinus, Settings, Shield, Ticket, Building2, BarChart3, Car,
  UserCircle2, MapPin, History, AlertTriangle, ArrowLeftRight, Palette, ShieldCheck,
} from 'lucide-vue-next';

const router = useRouter();
const auth = useAuthStore();
const toast = useToast();
const sidebarAbierto = ref(true);

const esSuperAdmin = computed(() => auth.usuario?.rol === 'SUPER_ADMIN');
const esProduccion = computed(() => auth.empresaActual?.ambiente === 'produccion');

const tieneVariasEmpresas = ref(false);

async function verificarVariasEmpresas() {
  try {
    const cache = localStorage.getItem('empresas_disponibles_cache');
    if (cache) {
      tieneVariasEmpresas.value = JSON.parse(cache).length > 1;
    }
  } catch {
    tieneVariasEmpresas.value = false;
  }
}

// Menú principal CON permisos requeridos
// permiso: null → siempre visible
// permiso: 'xxx' → solo si el usuario tiene ese permiso
const menu = [
  { nombre: 'Dashboard', icono: LayoutDashboard, ruta: '/', permiso: null },
  { nombre: 'Ventas', icono: Receipt, ruta: '/ventas', permiso: 'ver_ventas' },
  { nombre: 'Notas', icono: FileMinus, ruta: '/notas', permiso: 'ver_notas' },
  { nombre: 'Productos', icono: Package, ruta: '/productos', permiso: 'ver_productos' },
  { nombre: 'Clientes', icono: Users, ruta: '/clientes', permiso: 'ver_clientes' },
  { nombre: 'Compras', icono: ShoppingCart, ruta: '/compras', permiso: 'ver_compras' },
  { nombre: 'Proveedores', icono: Truck, ruta: '/proveedores', permiso: 'ver_compras' },
  { nombre: 'Transportistas', icono: Truck, ruta: '/transportistas', permiso: 'ver_guias' },
  { nombre: 'Vehículos', icono: Car, ruta: '/vehiculos', permiso: 'ver_guias' },
  { nombre: 'Conductores', icono: UserCircle2, ruta: '/conductores', permiso: 'ver_guias' },
  { nombre: 'Direcciones', icono: MapPin, ruta: '/direcciones-traslado', permiso: 'ver_guias' },
  { nombre: 'Guías de remisión', icono: Truck, ruta: '/guias-remision', permiso: 'ver_guias' },
  { nombre: 'Finanzas', icono: Wallet, ruta: '/finanzas', permiso: 'ver_finanzas' },
  { nombre: 'Envíos SUNAT', icono: Ticket, ruta: '/tickets-sunat', permiso: null },
  { nombre: 'Configuración', icono: Settings, ruta: '/configuracion', permiso: 'editar_empresa' },
  { nombre: 'Seguridad SUNAT', icono: Shield, ruta: '/seguridad', permiso: 'editar_credenciales_sunat' },
  { nombre: 'Permisos', icono: ShieldCheck, ruta: '/permisos', permiso: 'gestionar_permisos' },
  { nombre: 'Personalización PDF', icono: Palette, ruta: '/personalizacion-pdf', permiso: 'personalizar_pdf' },
  { nombre: 'Auditoría', icono: History, ruta: '/auditoria', permiso: 'ver_auditoria' },
];

// Menú filtrado según permisos del usuario
const menuVisible = computed(() => {
  return menu.filter((item) => !item.permiso || auth.tienePermiso(item.permiso));
});

const menuAdmin = [
  { nombre: 'Panel global', icono: BarChart3, ruta: '/admin' },
  { nombre: 'Empresas', icono: Building2, ruta: '/admin/empresas' },
];

async function cambiarEmpresa() {
  try {
    const cache = localStorage.getItem('empresas_disponibles_cache');
    if (cache) {
      localStorage.setItem('empresas_disponibles', cache);
      router.push('/seleccionar-empresa');
    } else {
      toast.advertencia('Vuelve a iniciar sesión para cambiar de empresa');
    }
  } catch {
    toast.error('No se pudo cargar la lista de empresas');
  }
}

async function cerrarSesion() {
  try {
    await authService.logout();
  } catch {
    // Si falla, igual cerramos sesión local
  }
  auth.cerrarSesion();
  await router.push('/login');
}

onMounted(async () => {
  verificarVariasEmpresas();

  // Si no hay permisos cargados todavía, los cargamos
  if (auth.permisos.length === 0 && auth.token) {
    await auth.cargarMisPermisos();
  }
});
</script>

<template>
  <div class="layout">
    <!-- SIDEBAR -->
    <aside class="sidebar" :class="{ 'sidebar--cerrado': !sidebarAbierto }">
      <div class="sidebar__logo">
        <LayoutDashboard :size="26" class="sidebar__logo-icono" />
        <span v-if="sidebarAbierto" class="sidebar__logo-texto">Mi ERP</span>
      </div>

      <!-- CARD EMPRESA ACTIVA -->
      <div
        v-if="sidebarAbierto && auth.empresaActual"
        class="empresa-card"
        :class="{ 'empresa-card--produccion': esProduccion }"
      >
        <div class="empresa-card__header">
          <Building2 :size="14" />
          <span class="empresa-card__label">Empresa activa</span>
        </div>
        <div class="empresa-card__nombre">
          {{ auth.empresaActual.razon_social }}
        </div>
        <div class="empresa-card__meta">
          <span class="empresa-card__ruc">RUC {{ auth.empresaActual.ruc }}</span>
          <span
            class="empresa-card__ambiente"
            :class="{ 'empresa-card__ambiente--prod': esProduccion }"
          >
            ● {{ esProduccion ? 'PRODUCCIÓN' : 'BETA' }}
          </span>
        </div>
        <button
          v-if="tieneVariasEmpresas"
          class="empresa-card__cambiar"
          @click="cambiarEmpresa"
        >
          <ArrowLeftRight :size="12" /> Cambiar empresa
        </button>
      </div>

      <!-- Versión compacta (sidebar cerrado) -->
      <div
        v-else-if="!sidebarAbierto && auth.empresaActual"
        class="empresa-card-mini"
        :class="{ 'empresa-card-mini--produccion': esProduccion }"
        :title="auth.empresaActual.razon_social"
      >
        <Building2 :size="18" />
        <span class="empresa-card-mini__dot"></span>
      </div>

      <nav class="sidebar__nav">
        <!-- USAMOS menuVisible en vez de menu -->
        <RouterLink
          v-for="item in menuVisible"
          :key="item.ruta"
          :to="item.ruta"
          class="sidebar__link"
          active-class="sidebar__link--activo"
        >
          <component :is="item.icono" :size="20" />
          <span v-if="sidebarAbierto">{{ item.nombre }}</span>
        </RouterLink>

        <template v-if="esSuperAdmin">
          <div v-if="sidebarAbierto" class="sidebar__separador">Administración</div>
          <div v-else class="sidebar__separador-mini"></div>

          <RouterLink
            v-for="item in menuAdmin"
            :key="item.ruta"
            :to="item.ruta"
            class="sidebar__link sidebar__link--admin"
            active-class="sidebar__link--activo"
          >
            <component :is="item.icono" :size="20" />
            <span v-if="sidebarAbierto">{{ item.nombre }}</span>
          </RouterLink>
        </template>
      </nav>

      <div v-if="esSuperAdmin && sidebarAbierto" class="sidebar__footer">
        <Shield :size="14" />
        <span>Modo administrador</span>
      </div>
    </aside>

    <!-- CONTENIDO -->
    <div class="contenido">
      <!-- Banner producción -->
      <div v-if="esProduccion" class="banner-produccion">
        <AlertTriangle :size="14" />
        <strong>Estás en PRODUCCIÓN.</strong>
        <span>Los comprobantes que emitas serán REALES y registrados en SUNAT.</span>
      </div>

      <header class="header">
        <button class="header__toggle" @click="sidebarAbierto = !sidebarAbierto">
          <Menu :size="22" />
        </button>
        <div class="header__usuario">
          <div class="header__info">
            <span class="header__nombre">{{ auth.usuario?.nombre }}</span>
            <span class="header__rol">{{ auth.usuario?.rol }}</span>
          </div>
          <button class="header__salir" @click="cerrarSesion" title="Cerrar sesión">
            <Power :size="18" />
          </button>
        </div>
      </header>

      <main class="vista">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
}

/* SIDEBAR */
.sidebar {
  width: 240px;
  background: var(--bg-sidebar);
  color: var(--text-on-dark);
  display: flex;
  flex-direction: column;
  transition: width var(--transition);
  flex-shrink: 0;
  position: relative;
}
.sidebar__link svg { flex-shrink: 0; }
.sidebar--cerrado { width: 72px; }

.sidebar__logo {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-lg) var(--space-md);
  font-size: var(--text-xl);
  font-weight: 700;
}
.sidebar__logo-icono { font-size: 1.8rem; }

/* CARD EMPRESA ACTIVA */
.empresa-card {
  margin: 0 var(--space-sm) var(--space-md);
  padding: var(--space-md);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--warning);
}
.empresa-card--produccion {
  border-left-color: var(--success);
  background: rgba(34, 197, 94, 0.08);
}
.empresa-card__header {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  text-transform: uppercase;
  color: rgba(245, 241, 236, 0.5);
  letter-spacing: 0.5px;
  font-weight: 700;
  margin-bottom: 6px;
}
.empresa-card__label { font-weight: 600; }
.empresa-card__nombre {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-on-dark);
  line-height: 1.3;
  margin-bottom: 4px;
}
.empresa-card__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.empresa-card__ruc {
  font-size: 11px;
  font-family: monospace;
  color: rgba(245, 241, 236, 0.6);
}
.empresa-card__ambiente {
  font-size: 10px;
  font-weight: 700;
  color: var(--warning);
  letter-spacing: 0.5px;
}
.empresa-card__ambiente--prod {
  color: var(--success);
}
.empresa-card__cambiar {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: rgba(245, 241, 236, 0.9);
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  margin-top: var(--space-sm);
  transition: background var(--transition);
}
.empresa-card__cambiar:hover {
  background: rgba(255, 255, 255, 0.18);
}

/* CARD MINI */
.empresa-card-mini {
  position: relative;
  margin: 0 auto var(--space-md);
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(245, 241, 236, 0.7);
  border-left: 3px solid var(--warning);
}
.empresa-card-mini--produccion {
  border-left-color: var(--success);
}
.empresa-card-mini__dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  background: var(--warning);
  border-radius: 50%;
}
.empresa-card-mini--produccion .empresa-card-mini__dot {
  background: var(--success);
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 var(--space-sm) var(--space-md);
  flex: 1;
  overflow-y: auto;
}
.sidebar__link {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: 12px;
  border-radius: var(--radius-md);
  color: rgba(245, 241, 236, 0.7);
  font-size: var(--text-sm);
  font-weight: 500;
  transition: var(--transition);
}
.sidebar__link:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-on-dark);
}
.sidebar__link--activo {
  background: var(--accent);
  color: #fff;
}

.sidebar__separador {
  font-size: var(--text-xs);
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: rgba(245, 241, 236, 0.4);
  padding: var(--space-md) var(--space-sm) var(--space-sm);
  margin-top: var(--space-md);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.sidebar__separador-mini {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: var(--space-md) var(--space-sm) var(--space-sm);
}
.sidebar__link--admin {
  color: rgba(245, 241, 236, 0.85);
}

.sidebar__footer {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: rgba(194, 100, 63, 0.15);
  border: 1px solid rgba(194, 100, 63, 0.3);
  color: rgba(245, 241, 236, 0.9);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 600;
}

/* CONTENIDO */
.contenido {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* BANNER PRODUCCIÓN */
.banner-produccion {
  background: linear-gradient(90deg, var(--success), #16a34a);
  color: white;
  padding: 8px var(--space-lg);
  font-size: var(--text-xs);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-weight: 500;
}
.banner-produccion strong { font-weight: 700; }

/* HEADER */
.header {
  height: 64px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-lg);
  flex-shrink: 0;
}
.header__toggle {
  background: none;
  border: none;
  font-size: 1.4rem;
  color: var(--text-secondary);
  padding: var(--space-sm);
  border-radius: var(--radius-sm);
}
.header__toggle:hover { background: var(--bg-surface-2); }

.header__usuario {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}
.header__info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.header__nombre { font-weight: 600; font-size: var(--text-sm); }
.header__rol { font-size: var(--text-xs); color: var(--text-muted); }
.header__salir {
  background: var(--bg-surface-2);
  border: none;
  width: 38px; height: 38px;
  border-radius: var(--radius-md);
  font-size: 1.2rem;
  color: var(--danger);
}
.header__salir:hover { background: var(--danger-soft); }

.vista {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-lg);
  background: var(--bg-app);
}
</style>