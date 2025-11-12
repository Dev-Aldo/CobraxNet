export const palabrasProhibidas = [
  // Groserías comunes en español
  'puto', 'puta', 'pendejo', 'pendeja', 'verga', 'chingar', 'pinche', 'culero', 'culera',
  'cabron', 'cabrón', 'cabrona', 'mierda', 'joder', 'jodido', 'jodida', 'perra', 'puto',
  'chingada', 'chingado', 'chingon', 'chingón', 'chingona', 'putito', 'putita', 'pendejada',
  'vergas', 'vergon', 'vergón', 'puteria', 'putería', 'cagado', 'cagada', 'cagar',
  'mamada', 'mamado', 'mamar', 'madrazo', 'madriza', 'putazo', 'putada', 'joto', 'jota',
  'maricon', 'maricón', 'marica', 'panocha', 'chingar', 'chinguen',
  
  // Variaciones con números y símbolos
  'p3ndejo', 'pend3jo', 'p3nd3jo', 'put0', 'put@', 'put@s', 'c4bron', 'cabr0n',
  'verg4', 'v3rga', 'chng4', 'ching4', 'p1nche', 'p!nche', 'cu13ro',

  // Insultos y términos discriminatorios
  'nazi', 'sidoso', 'mongolito', 'retrasado', 'retrasada', 'mongol', 'estupido', 'estupida',
  'idiota', 'imbecil', 'tarado', 'tarada', 'zorra', 'perra', 'cerdo', 'prostituta',
  'prostituto', 'gay', 'lesbiana', 'maricon', 'maricón', 'marica', 'negro', 'negra', 'indio',
  'india', 'naco', 'naca', 'fracasado', 'fracasada'
];

// Función para verificar si un texto contiene palabras prohibidas
export const detectarPalabrasProhibidas = (texto) => {
  // Convertir el texto a minúsculas y quitar acentos
  const textoNormalizado = texto.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  
  // Dividir el texto en palabras
  const palabras = textoNormalizado.split(/\s+/);
  
  // Buscar palabras prohibidas
  const encontradas = palabrasProhibidas.filter(palabra => {
    const palabraNormalizada = palabra.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    
    // Verificar si alguna palabra del texto coincide o contiene la palabra prohibida
    return palabras.some(p => 
      p === palabraNormalizada || 
      p.includes(palabraNormalizada) ||
      // Verificar variaciones comunes
      p.replace(/[aá]/g, '@').includes(palabraNormalizada) ||
      p.replace(/[oó]/g, '0').includes(palabraNormalizada) ||
      p.replace(/[eé]/g, '3').includes(palabraNormalizada) ||
      p.replace(/[ií]/g, '1').includes(palabraNormalizada)
    );
  });
  
  return {
    tieneProhibidas: encontradas.length > 0,
    palabrasEncontradas: encontradas
  };
};
