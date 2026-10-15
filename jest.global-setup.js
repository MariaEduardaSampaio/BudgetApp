// Fuso fixo para que os testes de data/hora deem o mesmo resultado em qualquer máquina (inclusive no CI).
module.exports = () => {
  process.env.TZ = 'America/Sao_Paulo';
};
