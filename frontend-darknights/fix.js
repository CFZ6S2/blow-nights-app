const fs = require('fs');
const file = 'src/app/[city]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('¡Hola, {profile.nick}!', '{t(\'city.hello\')}, {profile.nick}!');
content = content.replace('Panel Maestro', '{t(\'city.super_admin\')}');
content = content.replace('>Admin<', '>{t(\'city.admin\')}<');
content = content.replace('>Salir<', '>{t(\'city.logout\')}<');
content = content.replace('Cerca de ti', '{t(\'city.near_you\')}');
content = content.replace('Ubicación aproximada', '{t(\'city.approx_location\')}');
content = content.replace('¿A dónde sales?', '{t(\'city.where_going\')}');
content = content.replace('Elige tu garito', '{t(\'city.choose_spot\')}');
content = content.replace('Mi Cartera', '{t(\'city.my_wallet\')}');
content = content.replace('Entradas y pases', '{t(\'city.tickets_passes\')}');
content = content.replace('>Chats<', '>{t(\'city.chats\')}<');
content = content.replace('Mensajes pendientes', '{t(\'city.pending_messages\')}');
content = content.replace('>Visitas<', '>{t(\'city.visits\')}<');
content = content.replace('Quién te ha visto', '{t(\'city.who_saw_you\')}');
content = content.replace('Instalar App', '{t(\'city.install_app\')}');
content = content.replace('Lleva Blow Nights en tu pantalla de inicio', '{t(\'city.take_home\')}');

content = content.replace("{profile?.premium ? 'Tu Cuenta VIP' : 'Hazte Premium'}", "{profile?.premium ? t('city.vip_account') : t('city.go_premium')}");
content = content.replace("{profile?.premium ? 'Disfruta de todas las ventajas' : 'Ver planes y beneficios'}", "{profile?.premium ? t('city.enjoy_advantages') : t('city.see_plans')}");
content = content.replace('>Ver más<', '>{t(\'city.see_more\')}<');

content = content.replace('Funciones VIP Activas', '{t(\'city.vip_active_features\')}');
content = content.replace('Modo Incógnito', '{t(\'city.incognito_mode\')}');
content = content.replace('Navega sin dejar rastro', '{t(\'city.navigate_hidden\')}');
content = content.replace('Boost Diario', '{t(\'city.daily_boost\')}');
content = content.replace('Más visibilidad en el mapa', '{t(\'city.more_visibility\')}');
content = content.replace("{profile.lastBoost && profile.lastBoost.toDate() > boostCooldown ? 'Usado' : 'Activar Boost'}", "{profile.lastBoost && profile.lastBoost.toDate() > boostCooldown ? t('city.used') : t('city.activate_boost')}");

fs.writeFileSync(file, content);
