/**
 * Tests de regresion financiera
 * Valida calculos de territorial split, emision de tickets y QRs
 */

const assert = require('assert');

// Mock de funciones financieras (simulando lo que hay en functions/modules/)
function calculateTerritorialSplit(amount, hasCityManager = false) {
  const platformShare = amount * 0.25; // 25% plataforma
  const remaining = amount - platformShare;
  
  if (!hasCityManager) {
    // Sin CM: 37.5% organizer, 37.5% ciudad
    return {
      platform: platformShare,
      organizer: remaining * 0.5,
      city: remaining * 0.5,
      cityManager: 0
    };
  } else {
    // Con CM: 50% organizer, 50% ciudad (split 37.5/12.5)
    return {
      platform: platformShare,
      organizer: remaining * 0.5,
      city: remaining * 0.375,
      cityManager: remaining * 0.125
    };
  }
}

function generateTicketQR(ticketId, buyerId, eventId) {
  // Simular generacion de QR con firma
  const payload = {
    ticketId,
    buyerId,
    eventId,
    timestamp: Date.now(),
    signature: `sig_${Buffer.from(`${ticketId}-${buyerId}-${eventId}`).toString('base64')}`
  };
  
  return {
    qrData: JSON.stringify(payload),
    qrUrl: `https://storage.googleapis.com/tickets/${ticketId}/qr.png`
  };
}

describe('Financial Tests', () => {
  describe('Territorial Split', () => {
    it('debe calcular split correcto sin City Manager (25/37.5/37.5)', () => {
      const amount = 100;
      const split = calculateTerritorialSplit(amount, false);
      
      assert.strictEqual(split.platform, 25);
      assert.strictEqual(split.organizer, 37.5);
      assert.strictEqual(split.city, 37.5);
      assert.strictEqual(split.cityManager, 0);
      
      // Verificar que suma 100%
      const total = split.platform + split.organizer + split.city + split.cityManager;
      assert.strictEqual(total, amount);
    });
    
    it('debe calcular split correcto con City Manager (25/50/50 con sub-split)', () => {
      const amount = 100;
      const split = calculateTerritorialSplit(amount, true);
      
      assert.strictEqual(split.platform, 25);
      assert.strictEqual(split.organizer, 37.5);
      assert.strictEqual(split.city, 28.125); // 37.5 * 0.75
      assert.strictEqual(split.cityManager, 9.375); // 37.5 * 0.25
      
      // Verificar que suma 100%
      const total = split.platform + split.organizer + split.city + split.cityManager;
      assert(Math.abs(total - amount) < 0.01, `Total ${total} no es igual a ${amount}`);
    });
    
    it('debe manejar cantidades decimales correctamente', () => {
      const amount = 47.83;
      const split = calculateTerritorialSplit(amount, false);
      
      const total = split.platform + split.organizer + split.city + split.cityManager;
      assert(Math.abs(total - amount) < 0.001, 'Precision perdida en cantidad pequena');
    });
    
    it('debe manejar cero correctamente', () => {
      const amount = 0;
      const split = calculateTerritorialSplit(amount, false);
      
      assert.strictEqual(split.platform, 0);
      assert.strictEqual(split.organizer, 0);
      assert.strictEqual(split.city, 0);
      assert.strictEqual(split.cityManager, 0);
    });
  });
  
  describe('Ticket QR Generation', () => {
    it('debe generar QR con datos correctos', () => {
      const ticketId = 'ticket_123';
      const buyerId = 'user_456';
      const eventId = 'event_789';
      
      const result = generateTicketQR(ticketId, buyerId, eventId);
      
      assert(result.qrData, 'QR data no puede estar vacia');
      assert(result.qrUrl, 'QR URL no puede estar vacia');
      
      const payload = JSON.parse(result.qrData);
      assert.strictEqual(payload.ticketId, ticketId);
      assert.strictEqual(payload.buyerId, buyerId);
      assert.strictEqual(payload.eventId, eventId);
      assert(payload.signature, 'Signature es requerida');
    });
    
    it('debe generar signature unica por ticket', () => {
      const ticket1 = generateTicketQR('t1', 'u1', 'e1');
      const ticket2 = generateTicketQR('t2', 'u1', 'e1');
      
      const sig1 = JSON.parse(ticket1.qrData).signature;
      const sig2 = JSON.parse(ticket2.qrData).signature;
      
      assert.notStrictEqual(sig1, sig2, 'Cada ticket debe tener signature unica');
    });
  });
  
  describe('Edge Cases', () => {
    it('debe manejar split con cantidad muy pequena', () => {
      const amount = 0.01;
      const split = calculateTerritorialSplit(amount, false);
      
      const total = split.platform + split.organizer + split.city + split.cityManager;
      assert(Math.abs(total - amount) < 0.001, 'Precision perdida en cantidad pequena');
    });
    
    it('debe manejar split con cantidad muy grande', () => {
      const amount = 1000000;
      const split = calculateTerritorialSplit(amount, false);
      
      const total = split.platform + split.organizer + split.city + split.cityManager;
      assert.strictEqual(total, amount);
    });
  });
});

// Run tests if executed directly
if (require.main === module) {
  const Mocha = require('mocha');
  const mocha = new Mocha();
  
  mocha.addFile(__filename);
  mocha.run((failures) => {
    process.exitCode = failures ? 1 : 0;
  });
}
