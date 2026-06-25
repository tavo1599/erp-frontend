// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { publico: true },
    },
    {
  path: '/seleccionar-empresa',
  name: 'seleccionar-empresa',
  component: () => import('../views/SeleccionEmpresaView.vue'),
},
    {
      path: '/',
      component: () => import('../layouts/MainLayout.vue'),
      meta: { requiereAuth: true },
      children: [
        {
          path: 'admin',
          name: 'admin-dashboard',
          component: () => import('../views/admin/AdminDashboardView.vue'),
        },
        {
          path: 'admin/empresas',
          name: 'admin-empresas',
          component: () => import('../views/admin/EmpresasView.vue'),
        },
        {
          path: '',
          name: 'dashboard',
          component: () => import('../views/DashboardView.vue'),
        },
        {
          path: 'productos',           // ← AGREGAR
          name: 'productos',
          component: () => import('../views/ProductosView.vue'),
        },
        {
          path: 'clientes',
          name: 'clientes',
          component: () => import('../views/ClientesView.vue'),
        },
        {
          path: 'ventas',
          name: 'ventas',
          component: () => import('../views/VentasView.vue'),
        },
        {
          path: 'ventas/nueva',
          name: 'venta-nueva',
          component: () => import('../views/VentaNuevaView.vue'),
        },
        {
          path: 'ventas/:id',
          name: 'venta-detalle',
          component: () => import('../views/VentaDetalleView.vue'),
        },
        {
          path: 'proveedores',
          name: 'proveedores',
          component: () => import('../views/ProveedoresView.vue'),
        },
        {
          path: 'compras',
          name: 'compras',
          component: () => import('../views/ComprasView.vue'),
        },
        {
          path: 'finanzas',
          name: 'finanzas',
          component: () => import('../views/FinanzasView.vue'),
        },
        {
          path: 'notas',
          name: 'notas',
          component: () => import('../views/NotasView.vue'),
        },
        {
          path: 'configuracion',
          name: 'configuracion',
          component: () => import('../views/ConfiguracionView.vue'),
        },
        {
          path: 'seguridad',
          name: 'seguridad',
          component: () => import('../views/SeguridadView.vue'),
        },
        {
          path: 'tickets-sunat',
          name: 'tickets-sunat',
          component: () => import('../views/TicketsView.vue'),
        },
        {
          path: 'transportistas',
          name: 'transportistas',
          component: () => import('../views/TransportistasView.vue'),
        },
        {
  path: 'vehiculos',
  name: 'vehiculos',
  component: () => import('../views/VehiculosView.vue'),
},
{
  path: 'conductores',
  name: 'conductores',
  component: () => import('../views/ConductoresView.vue'),
},
{
  path: 'direcciones-traslado',
  name: 'direcciones-traslado',
  component: () => import('../views/DireccionesTrasladoView.vue'),
},
{
  path: 'guias-remision',
  name: 'guias-remision',
  component: () => import('../views/GuiasRemisionView.vue'),
},
{
  path: 'guias-remision/nueva',
  name: 'guia-remision-nueva',
  component: () => import('../views/GuiaRemisionNuevaView.vue'),
},
{
  path: 'guias-remision/:id',
  name: 'guia-remision-detalle',
  component: () => import('../views/GuiaRemisionDetalleView.vue'),
},

{
  path: 'personalizacion-pdf',
  name: 'personalizacion-pdf',
  component: () => import('../views/PersonalizacionPdfView.vue'),
},
{
  path: 'permisos',
  name: 'permisos',
  component: () => import('../views/PermisosView.vue'),
},
        {
          path: 'notas/nueva-credito',
          name: 'nota-nueva-credito',
          component: () => import('../views/NotaNuevaView.vue'),
        },
        {
          path: 'auditoria',
          name: 'auditoria',
          component: () => import('../views/AuditoriaView.vue'),
        },
      ],
    },
  ],
});

// Guardia global: protege las rutas que requieren autenticación
router.beforeEach((to, from, next) => {
  const auth = useAuthStore();
  
  const rutasPublicas = ['/login', '/seleccionar-empresa'];
  
  if (!auth.estaAutenticado && !rutasPublicas.includes(to.path)) {
    next('/login');
  } else if (auth.estaAutenticado && to.path === '/login') {
    next('/');
  } else {
    next();
  }
});

export default router;