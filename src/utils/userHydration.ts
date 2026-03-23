import User from '../models/User';

/**
 * Hidrata una lista de objetos con datos de usuario desde la DB global.
 * @param items - Lista de objetos (Posts, Recursos, etc.)
 * @param userField - El campo que contiene el ID del usuario (ej: 'author', 'creator')
 * @param fields - Campos a traer del usuario (default: 'username avatar')
 */
export async function hydrate(items: any[], userField = 'author', fields = 'username avatar displayName') {
    if (!items || items.length === 0) return [];
    
    // Obtener IDs únicos de usuario
    const userIds = [...new Set(items.map(i => {
        const val = i[userField];
        return val ? val.toString() : null;
    }).filter(Boolean))];
    
    if (userIds.length === 0) return items;

    // Buscar usuarios en la DB global
    const users = await User.find({ _id: { $in: userIds } }).select(fields);
    const userMap: any = {};
    users.forEach(u => { 
        const userData = u.toObject();
        userMap[u._id.toString()] = {
            _id: u._id,
            username: userData.username,
            avatar: userData.avatar || '',
            displayName: userData.displayName || userData.username
        };
    });
    
    // Mapear de vuelta
    return items.map(i => {
        const obj = i.toObject ? i.toObject() : i;
        const uid = i[userField] ? i[userField].toString() : null;
        
        if (uid && userMap[uid]) {
            obj[userField] = userMap[uid];
        } else {
            // Si el usuario no existe en la DB global por ID, intentamos un último recurso: 
            // Si el objeto ya tenía un nombre de usuario (por una población previa fallida), podríamos buscarlo.
            // Pero lo ideal es que el ID sea correcto.
            if (uid) console.warn(`[Hydration] Usuario no encontrado en DB Global: ${uid} (en campo ${userField})`);
            obj[userField] = { 
                _id: uid,
                username: 'Usuario', 
                avatar: '',
                displayName: 'Usuario Central',
                isFallback: true 
            };
        }
        return obj;
    });
}

/**
 * Hidrata comentarios dentro de un objeto.
 */
export async function hydrateComments(item: any, fields = 'username avatar') {
    if (!item || !item.comments || item.comments.length === 0) return item;
    
    const userIds = [...new Set(item.comments.map((c: any) => c.user.toString()))];
    const users = await User.find({ _id: { $in: userIds } }).select(fields);
    const userMap: any = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });
    
    const obj = item.toObject ? item.toObject() : item;
    obj.comments = obj.comments.map((c: any) => ({
        ...c,
        user: userMap[c.user.toString()] || { username: 'Usuario central', avatar: '' }
    }));
    
    return obj;
}
