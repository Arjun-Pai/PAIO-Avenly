export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("jwk", key);
  return JSON.stringify(exported);
}

export async function importKey(jwkString: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkString);
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "AES-GCM",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptFile(file: File, key: CryptoKey): Promise<{ encryptedData: string, iv: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    arrayBuffer
  );

  // Convert ArrayBuffer to Base64 using a chunked approach or FileReader
  const encryptedBytes = new Uint8Array(encrypted);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < encryptedBytes.length; i += chunkSize) {
    const chunk = encryptedBytes.slice(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  const base64String = btoa(binary);
  const ivBase64 = btoa(String.fromCharCode(...iv));

  return { encryptedData: base64String, iv: ivBase64 };
}

export async function decryptFile(encryptedData: string, ivString: string, key: CryptoKey, fileType: string = "application/octet-stream"): Promise<Blob> {
  // Convert Base64 back to Uint8Array using a safe approach
  const binaryString = atob(encryptedData);
  const encryptedBytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    encryptedBytes[i] = binaryString.charCodeAt(i);
  }
  const ivStringDecoded = atob(ivString);
  const iv = new Uint8Array(ivStringDecoded.length);
  for (let i = 0; i < ivStringDecoded.length; i++) {
    iv[i] = ivStringDecoded.charCodeAt(i);
  }

  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encryptedBytes
  );

  return new Blob([decrypted], { type: fileType });
}
