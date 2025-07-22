export const genAdminId = () => {
    const id = Math.floor(100000 + Math.random() * 900000);
    
    return `ADM-${id}`;
}