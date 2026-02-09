// Função que calcula a distância entre dois pontos (Haversine)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distância em km
  
  return distance;
}

// Nova função que encontra o preço na tabela (Tiers)
export function calculateDeliveryFee(distance: number, tiers: any[]) {
    // Se não tiver tabela, retorna zero ou um padrão
    if (!tiers || tiers.length === 0) return { price: 0, time: 0 };

    // Ordena as faixas por distância (crescente)
    const sortedTiers = tiers.sort((a, b) => a.distance - b.distance);

    // Encontra a primeira faixa que cobre a distância
    const foundTier = sortedTiers.find((tier) => distance <= tier.distance);

    if (foundTier) {
        return { price: foundTier.price, time: foundTier.time };
    } else {
        // Se a distância for maior que a última faixa (ex: 15km e o limite é 10km)
        // Aqui você pode decidir: cobra a última taxa ou bloqueia?
        // Vamos retornar a última taxa + um extra, ou null para bloquear.
        // Por enquanto, vamos retornar a última taxa da lista.
        const lastTier = sortedTiers[sortedTiers.length - 1];
        return { price: lastTier.price, time: lastTier.time };
    }
}