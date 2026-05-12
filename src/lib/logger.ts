import fs from 'fs';
import path from 'path';

export interface LogEntry {
  id: string;
  timestamp: string;
  nomFichier: string;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'OTHER';
  details: string;
}

const getLogFilePath = () => path.join(process.cwd(), '.softavera', 'logs.json');

export function addLog(nomFichier: string, actionType: LogEntry['actionType'], details: string) {
  try {
    const logFilePath = getLogFilePath();
    const dirPath = path.dirname(logFilePath);

    // Ensure directory exists
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    let logs: LogEntry[] = [];
    if (fs.existsSync(logFilePath)) {
      const content = fs.readFileSync(logFilePath, 'utf-8');
      if (content) logs = JSON.parse(content);
    }

    const newLog: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      nomFichier,
      actionType,
      details,
    };

    logs.push(newLog);

    fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
    return true;
  } catch (error) {
    console.error("Erreur lors de l'enregistrement du log:", error);
    return false;
  }
}

export function getLogs(): LogEntry[] {
  try {
    const logFilePath = getLogFilePath();
    if (!fs.existsSync(logFilePath)) {
      return [];
    }
    const content = fs.readFileSync(logFilePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error("Erreur lors de la lecture des logs:", error);
    return [];
  }
}
