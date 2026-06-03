// Utilitaire de session cryptographique utilisant l'API Web Crypto standard.
// Entièrement compatible avec Node.js et Next.js Middleware (Edge Runtime).

const SECRET_KEY = process.env.SESSION_SECRET || 'softavera-super-secret-key-at-least-32-chars-long';

/**
 * Créer un jeton signé HMAC-SHA256 contenant les données de session.
 */
export async function encrypt(payload: any): Promise<string> {
  const encoder = new TextEncoder();
  
  // Importer la clé secrète pour HMAC
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Expiration par défaut : 1 jour
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const data = btoa(JSON.stringify({ 
    ...payload, 
    exp: Date.now() + 24 * 60 * 60 * 1000 
  }));
  
  const token = `${header}.${data}`;
  
  // Signer le jeton
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(token)
  );
  
  // Encoder la signature en base64url
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
    
  return `${token}.${signatureBase64}`;
}

/**
 * Vérifier et décoder un jeton signé. Retourne le payload ou null si invalide/expiré.
 */
export async function decrypt(token: string): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [header, data, signatureBase64] = parts;
    const tokenToVerify = `${header}.${data}`;
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(SECRET_KEY),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    // Décoder la signature base64url en Uint8Array
    const binarySignature = atob(
      signatureBase64
        .replace(/-/g, '+')
        .replace(/_/g, '/')
    );
    const signatureBuffer = new Uint8Array(binarySignature.length);
    for (let i = 0; i < binarySignature.length; i++) {
      signatureBuffer[i] = binarySignature.charCodeAt(i);
    }
    
    // Vérifier la signature
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      encoder.encode(tokenToVerify)
    );
    
    if (!isValid) return null;
    
    // Décoder et vérifier la date d'expiration
    const payload = JSON.parse(atob(data));
    if (payload.exp && payload.exp < Date.now()) {
      return null; // Expiré
    }
    
    return payload;
  } catch (e) {
    console.error('Error decrypting session token:', e);
    return null;
  }
}
