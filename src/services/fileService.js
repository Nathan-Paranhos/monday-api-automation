const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../../logs/logger');
const { AppError } = require('../middlewares/errorHandler');

/**
 * Serviço de gerenciamento de arquivos
 * Gerencia criação de estruturas de pastas e operações de arquivos
 */
class FileService {
  constructor() {
    this.baseDir = process.env.BASE_DIRECTORY || './data';
    this.allowedExtensions = ['.txt', '.json', '.csv', '.xlsx', '.pdf', '.doc', '.docx'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }

  /**
   * Cria estrutura de pastas para cliente e produto
   */
  async createFolderStructure(clienteId, produto, responsavel) {
    try {
      logger.info('Criando estrutura de pastas', {
        clienteId,
        produto,
        responsavel
      });

      // Sanitizar nomes para uso em sistema de arquivos
      const sanitizedCliente = this.sanitizeFileName(clienteId);
      const sanitizedProduto = this.sanitizeFileName(produto);
      const sanitizedResponsavel = this.sanitizeFileName(responsavel);

      // Definir estrutura de pastas
      const folderStructure = {
        cliente: sanitizedCliente,
        produto: sanitizedProduto,
        responsavel: sanitizedResponsavel,
        basePath: path.join(this.baseDir, sanitizedCliente),
        productPath: path.join(this.baseDir, sanitizedCliente, sanitizedProduto),
        folders: {
          documentos: path.join(this.baseDir, sanitizedCliente, sanitizedProduto, 'documentos'),
          imagens: path.join(this.baseDir, sanitizedCliente, sanitizedProduto, 'imagens'),
          relatorios: path.join(this.baseDir, sanitizedCliente, sanitizedProduto, 'relatorios'),
          backup: path.join(this.baseDir, sanitizedCliente, sanitizedProduto, 'backup'),
          temp: path.join(this.baseDir, sanitizedCliente, sanitizedProduto, 'temp')
        }
      };

      // Criar todas as pastas
      await this.ensureDirectoryExists(folderStructure.basePath);
      await this.ensureDirectoryExists(folderStructure.productPath);
      
      for (const [folderName, folderPath] of Object.entries(folderStructure.folders)) {
        await this.ensureDirectoryExists(folderPath);
        logger.debug(`Pasta criada: ${folderName}`, { path: folderPath });
      }

      // Criar arquivo de metadados
      const metadata = {
        clienteId,
        produto,
        responsavel,
        createdAt: new Date().toISOString(),
        structure: folderStructure,
        version: '1.0'
      };

      const metadataPath = path.join(folderStructure.productPath, 'metadata.json');
      await this.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      // Criar arquivo README
      const readmeContent = this.generateReadmeContent(clienteId, produto, responsavel);
      const readmePath = path.join(folderStructure.productPath, 'README.md');
      await this.writeFile(readmePath, readmeContent);

      logger.info('Estrutura de pastas criada com sucesso', {
        clienteId,
        produto,
        basePath: folderStructure.basePath,
        foldersCreated: Object.keys(folderStructure.folders).length
      });

      return folderStructure;

    } catch (error) {
      logger.error('Erro ao criar estrutura de pastas', {
        clienteId,
        produto,
        error: error.message
      });
      throw new AppError(
        `Erro ao criar estrutura de pastas: ${error.message}`,
        500,
        'FOLDER_CREATION_ERROR'
      );
    }
  }

  /**
   * Verifica se estrutura de pastas existe
   */
  async checkFolderStructure(clienteId, produto) {
    try {
      const sanitizedCliente = this.sanitizeFileName(clienteId);
      const sanitizedProduto = this.sanitizeFileName(produto);
      const productPath = path.join(this.baseDir, sanitizedCliente, sanitizedProduto);
      
      const exists = await this.directoryExists(productPath);
      
      if (exists) {
        // Verificar se tem metadados
        const metadataPath = path.join(productPath, 'metadata.json');
        const hasMetadata = await this.fileExists(metadataPath);
        
        let metadata = null;
        if (hasMetadata) {
          const metadataContent = await this.readFile(metadataPath);
          metadata = JSON.parse(metadataContent);
        }
        
        return {
          exists: true,
          path: productPath,
          hasMetadata,
          metadata,
          createdAt: metadata?.createdAt || null
        };
      }
      
      return {
        exists: false,
        path: productPath
      };
      
    } catch (error) {
      logger.error('Erro ao verificar estrutura de pastas', {
        clienteId,
        produto,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Lista arquivos em uma pasta
   */
  async listFiles(folderPath, options = {}) {
    try {
      const {
        recursive = false,
        includeHidden = false,
        filterExtensions = null,
        sortBy = 'name', // name, size, date
        sortOrder = 'asc' // asc, desc
      } = options;

      if (!await this.directoryExists(folderPath)) {
        throw new AppError('Pasta não encontrada', 404, 'DIRECTORY_NOT_FOUND');
      }

      const files = [];
      await this.scanDirectory(folderPath, files, recursive, includeHidden, filterExtensions);

      // Ordenar arquivos
      files.sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'size':
            comparison = a.size - b.size;
            break;
          case 'date':
            comparison = new Date(a.modifiedAt) - new Date(b.modifiedAt);
            break;
          case 'name':
          default:
            comparison = a.name.localeCompare(b.name);
            break;
        }
        
        return sortOrder === 'desc' ? -comparison : comparison;
      });

      return {
        path: folderPath,
        files,
        total: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0)
      };

    } catch (error) {
      logger.error('Erro ao listar arquivos', {
        folderPath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Cria backup de uma pasta
   */
  async createBackup(sourcePath, backupName = null) {
    try {
      if (!await this.directoryExists(sourcePath)) {
        throw new AppError('Pasta de origem não encontrada', 404, 'SOURCE_NOT_FOUND');
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = backupName || `backup_${timestamp}`;
      const backupPath = path.join(path.dirname(sourcePath), 'backups', backupFileName);

      await this.ensureDirectoryExists(path.dirname(backupPath));
      await this.copyDirectory(sourcePath, backupPath);

      // Criar arquivo de informações do backup
      const backupInfo = {
        sourcePath,
        backupPath,
        createdAt: new Date().toISOString(),
        backupName: backupFileName,
        version: '1.0'
      };

      const infoPath = path.join(backupPath, 'backup-info.json');
      await this.writeFile(infoPath, JSON.stringify(backupInfo, null, 2));

      logger.info('Backup criado com sucesso', {
        sourcePath,
        backupPath,
        backupName: backupFileName
      });

      return {
        success: true,
        backupPath,
        backupName: backupFileName,
        createdAt: backupInfo.createdAt
      };

    } catch (error) {
      logger.error('Erro ao criar backup', {
        sourcePath,
        backupName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Remove arquivos temporários antigos
   */
  async cleanupTempFiles(maxAge = 24 * 60 * 60 * 1000) { // 24 horas
    try {
      const tempBasePath = path.join(this.baseDir, 'temp');
      
      if (!await this.directoryExists(tempBasePath)) {
        return { cleaned: 0, totalSize: 0 };
      }

      const files = await this.listFiles(tempBasePath, { recursive: true });
      const now = Date.now();
      let cleaned = 0;
      let totalSize = 0;

      for (const file of files.files) {
        const fileAge = now - new Date(file.modifiedAt).getTime();
        
        if (fileAge > maxAge) {
          try {
            await fs.unlink(file.path);
            cleaned++;
            totalSize += file.size;
            logger.debug('Arquivo temporário removido', { path: file.path, age: fileAge });
          } catch (error) {
            logger.warn('Erro ao remover arquivo temporário', {
              path: file.path,
              error: error.message
            });
          }
        }
      }

      logger.info('Limpeza de arquivos temporários concluída', {
        cleaned,
        totalSize,
        maxAge
      });

      return { cleaned, totalSize };

    } catch (error) {
      logger.error('Erro na limpeza de arquivos temporários', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtém informações de uso de disco
   */
  async getDiskUsage(targetPath = null) {
    try {
      const checkPath = targetPath || this.baseDir;
      
      if (!await this.directoryExists(checkPath)) {
        return { exists: false };
      }

      const usage = await this.calculateDirectorySize(checkPath);
      
      return {
        exists: true,
        path: checkPath,
        totalSize: usage.totalSize,
        fileCount: usage.fileCount,
        directoryCount: usage.directoryCount,
        formattedSize: this.formatBytes(usage.totalSize)
      };

    } catch (error) {
      logger.error('Erro ao calcular uso de disco', {
        targetPath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Verifica saúde do sistema de arquivos
   */
  async checkHealth() {
    try {
      const health = {
        baseDirectory: {
          exists: await this.directoryExists(this.baseDir),
          writable: false,
          readable: false
        },
        diskUsage: null,
        tempCleanup: null,
        errors: []
      };

      // Testar permissões de escrita
      try {
        const testFile = path.join(this.baseDir, '.health-check');
        await this.writeFile(testFile, 'health check');
        await fs.unlink(testFile);
        health.baseDirectory.writable = true;
        health.baseDirectory.readable = true;
      } catch (error) {
        health.errors.push(`Erro de permissões: ${error.message}`);
      }

      // Obter uso de disco
      try {
        health.diskUsage = await this.getDiskUsage();
      } catch (error) {
        health.errors.push(`Erro ao calcular uso de disco: ${error.message}`);
      }

      // Testar limpeza de arquivos temporários
      try {
        health.tempCleanup = await this.cleanupTempFiles();
      } catch (error) {
        health.errors.push(`Erro na limpeza de temporários: ${error.message}`);
      }

      health.status = health.errors.length === 0 ? 'healthy' : 'unhealthy';

      return health;

    } catch (error) {
      logger.error('Erro na verificação de saúde do sistema de arquivos', {
        error: error.message
      });
      throw error;
    }
  }

  // Métodos auxiliares

  /**
   * Sanitiza nome de arquivo
   */
  sanitizeFileName(fileName) {
    return fileName
      .toString()
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 100); // Limitar tamanho
  }

  /**
   * Garante que diretório existe
   */
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Verifica se diretório existe
   */
  async directoryExists(dirPath) {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Verifica se arquivo existe
   */
  async fileExists(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Escreve arquivo
   */
  async writeFile(filePath, content) {
    await this.ensureDirectoryExists(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf8');
  }

  /**
   * Lê arquivo
   */
  async readFile(filePath) {
    return await fs.readFile(filePath, 'utf8');
  }

  /**
   * Copia diretório recursivamente
   */
  async copyDirectory(source, destination) {
    await this.ensureDirectoryExists(destination);
    const entries = await fs.readdir(source, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Escaneia diretório recursivamente
   */
  async scanDirectory(dirPath, files, recursive, includeHidden, filterExtensions) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!includeHidden && entry.name.startsWith('.')) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (recursive) {
          await this.scanDirectory(fullPath, files, recursive, includeHidden, filterExtensions);
        }
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        
        if (filterExtensions && !filterExtensions.includes(ext)) {
          continue;
        }

        const stats = await fs.stat(fullPath);
        files.push({
          name: entry.name,
          path: fullPath,
          size: stats.size,
          extension: ext,
          modifiedAt: stats.mtime.toISOString(),
          createdAt: stats.birthtime.toISOString()
        });
      }
    }
  }

  /**
   * Calcula tamanho de diretório
   */
  async calculateDirectorySize(dirPath) {
    let totalSize = 0;
    let fileCount = 0;
    let directoryCount = 0;

    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        directoryCount++;
        const subDirSize = await this.calculateDirectorySize(fullPath);
        totalSize += subDirSize.totalSize;
        fileCount += subDirSize.fileCount;
        directoryCount += subDirSize.directoryCount;
      } else {
        fileCount++;
        const stats = await fs.stat(fullPath);
        totalSize += stats.size;
      }
    }

    return { totalSize, fileCount, directoryCount };
  }

  /**
   * Formata bytes em formato legível
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Gera conteúdo do README
   */
  generateReadmeContent(clienteId, produto, responsavel) {
    return `# ${produto} - ${clienteId}

## Informações do Projeto

- **Cliente:** ${clienteId}
- **Produto:** ${produto}
- **Responsável:** ${responsavel}
- **Criado em:** ${new Date().toLocaleDateString('pt-BR')}

## Estrutura de Pastas

- **documentos/**: Documentos relacionados ao projeto
- **imagens/**: Imagens e recursos visuais
- **relatorios/**: Relatórios e análises
- **backup/**: Backups automáticos
- **temp/**: Arquivos temporários

## Metadados

As informações detalhadas do projeto estão disponíveis no arquivo \`metadata.json\`.

---

*Gerado automaticamente pela API de Automação Monday.com*
`;
  }
}

module.exports = FileService;