const fs = require('fs-extra');
const path = require('path');
const config = require('../config/config');
const { logCriacaoPasta, logCopiaArquivo, logErro } = require('../logs/logger');

/**
 * Gerenciador de arquivos e pastas
 * Responsável por criar estrutura de diretórios e copiar arquivos modelo
 */
class FileManager {
  /**
   * Cria a estrutura de pastas para um cliente baseado no produto
   * @param {string} produto - Nome do produto ("Fórmula Certa" ou "Phusion")
   * @param {number} idCliente - ID do cliente
   * @returns {Promise<string>} Caminho da pasta criada
   * @throws {Error} Se não conseguir criar a pasta
   */
  async criarEstruturaPasta(produto, idCliente) {
    try {
      // Gera o caminho completo da pasta
      const caminhoPasta = config.gerarCaminhoPasta(produto, idCliente);
      
      // Verifica se a pasta já existe
      const pastaExiste = await fs.pathExists(caminhoPasta);
      
      if (pastaExiste) {
        logCriacaoPasta(caminhoPasta, produto);
        return caminhoPasta;
      }
      
      // Cria a pasta recursivamente (cria diretórios pais se necessário)
      await fs.ensureDir(caminhoPasta);
      
      logCriacaoPasta(caminhoPasta, produto);
      
      return caminhoPasta;
      
    } catch (error) {
      logErro('Criação de pasta', error, { produto, idCliente });
      
      // Mensagens de erro mais específicas
      if (error.code === 'EACCES') {
        throw new Error(`Sem permissão para criar pasta no caminho especificado. Verifique as permissões.`);
      }
      
      if (error.code === 'ENOTDIR') {
        throw new Error(`Caminho inválido para criação da pasta.`);
      }
      
      if (error.code === 'ENOSPC') {
        throw new Error(`Espaço insuficiente em disco para criar a pasta.`);
      }
      
      throw new Error(`Erro ao criar pasta: ${error.message}`);
    }
  }

  /**
   * Copia o arquivo modelo .vsdx para a pasta do cliente
   * @param {string} caminhoPasta - Caminho da pasta de destino
   * @param {number} idCliente - ID do cliente (usado para nomear o arquivo)
   * @returns {Promise<string>} Caminho do arquivo copiado
   * @throws {Error} Se não conseguir copiar o arquivo
   */
  async copiarArquivoModelo(caminhoPasta, idCliente) {
    try {
      const caminhoOrigem = config.paths.modelFilePath;
      
      // Verifica se o arquivo modelo existe
      const arquivoExiste = await fs.pathExists(caminhoOrigem);
      
      if (!arquivoExiste) {
        throw new Error(`Arquivo modelo não encontrado: ${caminhoOrigem}`);
      }
      
      // Define o nome do arquivo de destino
      const nomeArquivoDestino = `Fluxo_Cliente_${idCliente}.vsdx`;
      const caminhoDestino = path.join(caminhoPasta, nomeArquivoDestino);
      
      // Verifica se o arquivo de destino já existe
      const destinoExiste = await fs.pathExists(caminhoDestino);
      
      if (destinoExiste) {
        logCopiaArquivo(caminhoOrigem, caminhoDestino);
        return caminhoDestino;
      }
      
      // Copia o arquivo
      await fs.copy(caminhoOrigem, caminhoDestino);
      
      logCopiaArquivo(caminhoOrigem, caminhoDestino);
      
      return caminhoDestino;
      
    } catch (error) {
      logErro('Cópia de arquivo modelo', error, { caminhoPasta, idCliente });
      
      // Mensagens de erro mais específicas
      if (error.code === 'ENOENT') {
        throw new Error(`Arquivo modelo não encontrado: ${config.paths.modelFilePath}`);
      }
      
      if (error.code === 'EACCES') {
        throw new Error(`Sem permissão para copiar o arquivo. Verifique as permissões.`);
      }
      
      if (error.code === 'ENOSPC') {
        throw new Error(`Espaço insuficiente em disco para copiar o arquivo.`);
      }
      
      throw new Error(`Erro ao copiar arquivo modelo: ${error.message}`);
    }
  }

  /**
   * Processo completo: cria pasta e copia arquivo modelo
   * @param {string} produto - Nome do produto
   * @param {number} idCliente - ID do cliente
   * @returns {Promise<object>} Objeto com caminho da pasta e arquivo copiado
   */
  async processarCliente(produto, idCliente) {
    try {
      // Valida o produto
      if (!config.isProdutoValido(produto)) {
        throw new Error(`Produto inválido: ${produto}`);
      }
      
      // Cria a estrutura de pasta
      const caminhoPasta = await this.criarEstruturaPasta(produto, idCliente);
      
      // Copia o arquivo modelo
      const caminhoArquivo = await this.copiarArquivoModelo(caminhoPasta, idCliente);
      
      return {
        caminhoPasta,
        caminhoArquivo,
        produto,
        idCliente
      };
      
    } catch (error) {
      logErro('Processamento completo do cliente', error, { produto, idCliente });
      throw error;
    }
  }

  /**
   * Verifica se uma pasta existe
   * @param {string} caminhoPasta - Caminho da pasta
   * @returns {Promise<boolean>} True se a pasta existe
   */
  async verificarPastaExiste(caminhoPasta) {
    try {
      return await fs.pathExists(caminhoPasta);
    } catch (error) {
      return false;
    }
  }

  /**
   * Verifica se um arquivo existe
   * @param {string} caminhoArquivo - Caminho do arquivo
   * @returns {Promise<boolean>} True se o arquivo existe
   */
  async verificarArquivoExiste(caminhoArquivo) {
    try {
      const stats = await fs.stat(caminhoArquivo);
      return stats.isFile();
    } catch (error) {
      return false;
    }
  }

  /**
   * Lista o conteúdo de uma pasta
   * @param {string} caminhoPasta - Caminho da pasta
   * @returns {Promise<Array>} Lista de arquivos e pastas
   */
  async listarConteudoPasta(caminhoPasta) {
    try {
      const existe = await this.verificarPastaExiste(caminhoPasta);
      
      if (!existe) {
        return [];
      }
      
      return await fs.readdir(caminhoPasta);
    } catch (error) {
      logErro('Listagem de conteúdo da pasta', error, { caminhoPasta });
      return [];
    }
  }

  /**
   * Remove uma pasta e todo seu conteúdo (usar com cuidado)
   * @param {string} caminhoPasta - Caminho da pasta
   * @returns {Promise<boolean>} True se removeu com sucesso
   */
  async removerPasta(caminhoPasta) {
    try {
      const existe = await this.verificarPastaExiste(caminhoPasta);
      
      if (!existe) {
        return true;
      }
      
      await fs.remove(caminhoPasta);
      return true;
    } catch (error) {
      logErro('Remoção de pasta', error, { caminhoPasta });
      return false;
    }
  }
}

module.exports = FileManager;