// src/lib/geo.ts

// 1. Calcula a distância em KM (Matemática pura)
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Raio da Terra
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; 
    return parseFloat(distance.toFixed(1));
  }
  
  // 2. Encontra o preço na tabela de faixas
  export function calculateDeliveryFee(distance: number, tiers: any[]) {
      if (!tiers || tiers.length === 0) return { price: 0, time: 0, valid: true };
  
      const sortedTiers = tiers.sort((a, b) => a.distance - b.distance);
      const foundTier = sortedTiers.find((tier) => distance <= tier.distance);
  
      if (foundTier) {
          return { price: foundTier.price, time: foundTier.time, valid: true };
      } else {
          // Retorna falso se for longe demais
          return { price: 0, time: 0, valid: false };
      }
  }
  
  // 3. Transforma Endereço em Coordenadas (API Grátis)
  export async function getCoordinates(address: string) {
      try {
          const cleanAddress = address.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const query = encodeURIComponent(cleanAddress);
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;
          
          const res = await fetch(url);
          const data = await res.json();
  
          if (data && data.length > 0) {
              return {
                  lat: parseFloat(data[0].lat),
                  lon: parseFloat(data[0].lon)
              };
          }
          return null;
      } catch (error) {
          console.error("Erro GPS:", error);
          return null;
      }
  }