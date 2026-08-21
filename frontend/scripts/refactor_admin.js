const fs = require('fs');
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

// Add import
code = code.replace(/import \{ useState, useEffect \} from 'react';/, "import { useState, useEffect } from 'react';\nimport { useTranslation } from 'react-i18next';");

// Add hook
code = code.replace(/export default function AdminDashboard\(\) \{/, "export default function AdminDashboard() {\n  const { t } = useTranslation();");

// Replace texts
code = code.replace(/>ADMIN DASHBOARD</g, ">{t('admin.title')}<");
code = code.replace(/>Control optimizado de infraestructura y métricas\.</g, ">{t('admin.subtitle')}<");
code = code.replace(/>Panel Maestro</g, ">{t('admin.master_panel')}<");
code = code.replace(/>Volver</g, ">{t('admin.back')}<");
code = code.replace(/>Ecosistema</g, ">{t('admin.ecosystem')}<");
code = code.replace(/>Puente Dark Nights</g, ">{t('admin.dark_nights_bridge')}<");
code = code.replace(/>Permite a los usuarios saltar al circuito general</g, ">{t('admin.dark_nights_desc')}<");

// StatCard labels
code = code.replace(/label="Usuarios"/g, "label={t('admin.users')}");
code = code.replace(/label="Online"/g, "label={t('admin.online')}");
code = code.replace(/label="Premium"/g, "label={t('admin.premium')}");
code = code.replace(/label="Reportes"/g, "label={t('admin.reports')}");

// Tabs
code = code.replace(/label="General"/g, "label={t('admin.general')}");
code = code.replace(/label="Verificaciones"/g, "label={t('admin.verifications')}");
code = code.replace(/label=\{`RRPP \(\$\{rrppApps.length\}\)`\}/g, "label={`${t('admin.rrpp')} (${rrppApps.length})`}");

// rrpp messages
code = code.replace(/>No hay solicitudes RRPP pendientes\.</g, ">{t('admin.no_rrpp')}<");
code = code.replace(/>Pendiente</g, ">{t('admin.pending')}<");
code = code.replace(/>Aprobar</g, ">{t('admin.approve')}<");
code = code.replace(/>Rechazar</g, ">{t('admin.reject')}<");
code = code.replace(/>Ratios del Sistema</g, ">{t('admin.system_ratios')}<");
code = code.replace(/>Conversión Premium</g, ">{t('admin.conversion_premium')}<");
code = code.replace(/>Usuarios Online</g, ">{t('admin.users_online')}<");
code = code.replace(/placeholder="Filtrar por nick..."/g, "placeholder={t('admin.filter_nick')}");
code = code.replace(/>BANEADO</g, ">{t('admin.banned')}<");
code = code.replace(/>BANEAR</g, ">{t('admin.ban')}<");
code = code.replace(/>ELIMINAR</g, ">{t('admin.delete')}<");
code = code.replace(/>Cargar más usuarios</g, ">{t('admin.load_more')}<");
code = code.replace(/>Cargando\.\.\.</g, ">{t('admin.loading')}<");
code = code.replace(/>RESOLVER</g, ">{t('admin.resolve')}<");
code = code.replace(/>RESUELTO</g, ">{t('admin.resolved')}<");
code = code.replace(/>\.\.\.</g, ">{t('admin.processing')}<");

fs.writeFileSync('src/app/admin/page.tsx', code);
