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
    const allUserIds = new Set<string>();
    items.forEach(i => {
        const val = i[userField];
        if (Array.isArray(val)) {
            val.forEach(id => { if (id) allUserIds.add(id.toString()); });
        } else if (val) {
            allUserIds.add(val.toString());
        }
    });
    
    const userIds = Array.from(allUserIds);
    if (userIds.length === 0) return items;

    // Buscar usuarios en la DB global
    const users = await User.find({ _id: { $in: userIds } }).select(fields);
    const userMap: any = {};
    users.forEach(u => { 
        const userData = u.toObject();
        userMap[u._id.toString()] = {
            ...userData,
            _id: u._id,
            avatar: userData.avatar || '',
            displayName: userData.displayName || userData.username
        };
    });
    
    // Mapear de vuelta
    return items.map(i => {
        const obj = i.toObject ? i.toObject() : { ...i };
        const val = i[userField];
        
        if (Array.isArray(val)) {
            obj[userField] = val.map(id => userMap[id.toString()] || { _id: id, username: 'Usuario', displayName: 'Usuario central', isFallback: true });
        } else if (val) {
            const uid = val.toString();
            obj[userField] = userMap[uid] || { _id: uid, username: 'Usuario', displayName: 'Usuario central', isFallback: true };
        }

        // Asegurar consistencia entre author, creator y creador
        if (userField === 'creator' || userField === 'creador') {
            obj.author = obj[userField];
        } else if (userField === 'author') {
            obj.creator = obj.author;
            obj.creador = obj.author;
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

/**
 * Hidrata los likes dentro de un objeto con datos de usuario (username, displayName, avatar).
 */
export async function hydrateLikes(item: any, fields = 'username displayName avatar') {
    if (!item) return item;
    const obj = item.toObject ? item.toObject() : item;
    if (!obj.likes || !Array.isArray(obj.likes) || obj.likes.length === 0) {
        obj.likesUsers = [];
        return obj;
    }
    
    const userIds: string[] = Array.from(new Set(obj.likes.map((id: any) => (id?._id || id).toString())));
    const users = await User.find({ _id: { $in: userIds } }).select(fields);
    const userMap: Record<string, any> = {};
    users.forEach(u => { 
        const d = u.toObject() as any;
        userMap[u._id.toString()] = {
            _id: u._id,
            username: d.username,
            displayName: d.displayName || d.username,
            avatar: d.avatar || ''
        }; 
    });

    obj.likesUsers = userIds.map((id: string) => userMap[id] || { _id: id, username: 'Usuario', displayName: 'Usuario', avatar: '' });
    return obj;
}

