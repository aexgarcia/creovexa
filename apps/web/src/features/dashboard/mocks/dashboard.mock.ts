import type { DashboardData } from '../types/dashboard.types';

export const dashboardMock: DashboardData = {
  metrics: {
    campaigns: {
      value: 24,
      variation: 12,
    },

    products: {
      value: 48,
      variation: 8,
    },

    publications: {
      value: 67,
      variation: 18,
    },

    pendingApproval: {
      value: 4,
    },
  },

  campaignStatus: {
    draft: 6,
    pendingApproval: 4,
    approved: 3,
    published: 10,
    failed: 1,
  },

  recentCampaigns: [
    {
      id: 'cmp-001',
      name: 'Promo Primavera',
      productName: 'Plan Premium',
      status: 'PENDING_APPROVAL',
      createdAt: '2026-09-22T14:30:00',
    },
    {
      id: 'cmp-002',
      name: 'Oferta Fin de Semana',
      productName: 'Pack Empresarial',
      status: 'PUBLISHED',
      createdAt: '2026-09-21T18:20:00',
    },
    {
      id: 'cmp-003',
      name: 'Lanzamiento Producto',
      productName: 'Producto Pro',
      status: 'APPROVED',
      createdAt: '2026-09-21T11:10:00',
    },
    {
      id: 'cmp-004',
      name: 'Campaña Septiembre',
      productName: 'Servicio Básico',
      status: 'DRAFT',
      createdAt: '2026-09-20T16:45:00',
    },
  ],

  publications: [
    {
      platform: 'FACEBOOK',
      published: 28,
      failed: 1,
      pending: 2,
    },
    {
      platform: 'INSTAGRAM',
      published: 24,
      failed: 2,
      pending: 1,
    },
    {
      platform: 'TIKTOK',
      published: 15,
      failed: 3,
      pending: 4,
    },
  ],

  recentActivity: [
    {
      id: 'act-001',
      action: 'PUBLICATION_SUCCEEDED',
      message: 'Promo Primavera fue publicada en Instagram.',
      createdAt: '2026-09-22T17:32:00',
    },
    {
      id: 'act-002',
      action: 'CAMPAIGN_APPROVED',
      message: 'Oferta Fin de Semana fue aprobada.',
      createdAt: '2026-09-22T16:48:00',
    },
    {
      id: 'act-003',
      action: 'CONTENT_GENERATED',
      message: 'Se generó contenido para Lanzamiento Producto.',
      createdAt: '2026-09-22T15:20:00',
    },
    {
      id: 'act-004',
      action: 'PUBLICATION_FAILED',
      message: 'Falló una publicación de TikTok.',
      createdAt: '2026-09-22T13:05:00',
    },
  ],
};
