/**
 * مستندات API
 * API Documentation
 */

module.exports = {
  title: 'Advanced Tunnel Server API',
  version: '1.0.0',
  description: 'سیستم تانل سرور فوق پیشرفته',
  endpoints: [
    {
      method: 'POST',
      path: '/api/tunnels/create',
      description: 'ایجاد تانل جدید',
      body: {
        localHost: 'string - میزبان محلی',
        localPort: 'number - پورت محلی',
        remoteHost: 'string - میزبان ریموت',
        remotePort: 'number - پورت ریموت',
        name: 'string - نام تانل',
        description: 'string - توضیحات',
        portCount: 'number - تعداد پورت‌ها (اختیاری)'
      }
    },
    {
      method: 'GET',
      path: '/api/tunnels/list',
      description: 'دریافت لیست تمام تانل‌ها'
    },
    {
      method: 'GET',
      path: '/api/tunnels/:tunnelId',
      description: 'دریافت جزئیات تانل'
    },
    {
      method: 'DELETE',
      path: '/api/tunnels/:tunnelId',
      description: 'حذف تانل'
    },
    {
      method: 'PUT',
      path: '/api/tunnels/:tunnelId/ports',
      description: 'تغییر پورت‌های تانل',
      body: {
        newPorts: 'array - پورت‌های جدید'
      }
    },
    {
      method: 'GET',
      path: '/api/tunnels/:tunnelId/connections',
      description: 'دریافت اتصالات فعال تانل'
    },
    {
      method: 'GET',
      path: '/api/tunnels/:tunnelId/stats',
      description: 'دریافت آمار تانل'
    },
    {
      method: 'GET',
      path: '/api/stats/global',
      description: 'دریافت آمار کلی سیستم'
    },
    {
      method: 'GET',
      path: '/api/stats/tunnel/:tunnelId',
      description: 'دریافت آمار دقیق تانل'
    },
    {
      method: 'GET',
      path: '/api/stats/connections',
      description: 'دریافت آمار اتصالات'
    },
    {
      method: 'GET',
      path: '/api/stats/live',
      description: 'دریافت آمار زمان واقعی'
    },
    {
      method: 'GET',
      path: '/api/admin/status',
      description: 'دریافت وضعیت سیستم'
    },
    {
      method: 'POST',
      path: '/api/admin/cleanup',
      description: 'پاک‌سازی سیستم'
    },
    {
      method: 'POST',
      path: '/api/admin/reset-stats',
      description: 'ریست کردن آمارها'
    },
    {
      method: 'GET',
      path: '/health',
      description: 'بررسی سلامت سرور'
    }
  ]
};
