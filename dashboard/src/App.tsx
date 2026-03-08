import { useState, useEffect } from 'react';
import { LayoutDashboard, Settings2, Plus, TerminalSquare, Network, Activity, Database, Zap } from 'lucide-react';
import classNames from 'classnames';
import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'mcp'>('overview');

  const [status, setStatus] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [mcp, setMcp] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);

  // Skill Creator Form State
  const [skillName, setSkillName] = useState('');
  const [skillDesc, setSkillDesc] = useState('');
  const [skillTriggers, setSkillTriggers] = useState('');
  const [skillPrompt, setSkillPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stRes, histRes, mcpRes, skRes] = await Promise.all([
          axios.get(`${API_BASE}/agent/status`),
          axios.get(`${API_BASE}/memory/history`),
          axios.get(`${API_BASE}/mcp/servers`),
          axios.get(`${API_BASE}/skills`)
        ]);
        setStatus(stRes.data);
        setHistory(histRes.data.history || []);
        setMcp(mcpRes.data.servers || []);
        setSkills(skRes.data.skills || []);
      } catch (err) {
        console.error("Erro ao buscar dados da API:", err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000); // Polling every 5s
    return () => clearInterval(interval);
  }, []);

  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage(null);
    try {
      const triggersArray = skillTriggers.split(',').map(t => t.trim()).filter(Boolean);
      await axios.post(`${API_BASE}/skills/create`, {
        name: skillName,
        description: skillDesc,
        triggers: triggersArray,
        prompt: skillPrompt
      });
      setSubmitMessage({ text: 'Habilidade criada com sucesso! Disponível imediatamente no Doug.', type: 'success' });
      setSkillName(''); setSkillDesc(''); setSkillTriggers(''); setSkillPrompt('');
    } catch (err: any) {
      setSubmitMessage({ text: err.response?.data?.error || 'Erro desconhecido ao criar skill.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'skills', label: 'Skill Creator', icon: Plus },
    { id: 'mcp', label: 'Ecosystem', icon: Network },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 p-4 shrink-0 flex flex-col h-screen sticky top-0">
        <div className="flex items-center gap-3 px-2 mb-8 mt-2 text-indigo-600">
          <TerminalSquare className="w-8 h-8" />
          <h1 className="text-xl font-bold tracking-tight text-gray-900">GravityClaw</h1>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={classNames(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                activeTab === item.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className={classNames("w-5 h-5", activeTab === item.id ? "text-indigo-600" : "text-gray-400")} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pb-4 px-3 flex items-center gap-3 text-sm font-medium text-gray-500 hover:text-gray-800 cursor-pointer pt-4 border-t border-gray-100">
          <Settings2 className="w-5 h-5 text-gray-400" />
          System Settings
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto w-full">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm shadow-blue-900/5">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Status</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${status?.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-3xl font-bold text-gray-900">{status ? 'Online' : 'Offline'}</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Versão {status?.version || '...'}</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm shadow-blue-900/5">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Memória RAM</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {status ? Math.round(status.memoryUsed / 1024 / 1024) : '--'}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">MB</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm shadow-blue-900/5">
                <div className="flex items-center gap-2 mb-2">
                  <Network className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">MCP Servers</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-gray-900">{mcp.length}</span>
                  <span className="text-sm text-gray-500 ml-2">tools</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm shadow-blue-900/5">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Skills</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-gray-900">{skills.length}</span>
                  <span className="text-sm text-gray-500 ml-2">ativas</span>
                </div>
              </div>

            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-8 shadow-blue-900/5 flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Memory History Feed</h3>
                <span className="text-sm text-gray-500">{history.length} entradas</span>
              </div>
              <div className="p-6 overflow-y-auto max-h-[500px] flex flex-col gap-4 bg-gray-50/50">
                {history.length === 0 && <p className="text-gray-400 text-center py-10">Nenhuma memória encontrada.</p>}
                {history.map((entry, idx) => (
                  <div key={idx} className={`p-4 rounded-lg border max-w-[85%] ${entry.role === 'user' ? 'bg-indigo-50 border-indigo-100 self-end rounded-br-none' : 'bg-white border-gray-200 self-start rounded-bl-none'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-xs font-bold uppercase ${entry.role === 'user' ? 'text-indigo-600' : 'text-gray-500'}`}>{entry.role === 'user' ? (entry.senderName || entry.senderId) : 'Doug AI'}</span>
                      <span className="text-xs text-gray-400">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">Skill Creator</h2>
            <p className="text-gray-500">Desenvolva novas habilidades (skills) para a IA. Sem precisar abrir o terminal ou rodar código manual, essas skills ficam disponíveis imediatamente.</p>

            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm max-w-4xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>

              <form onSubmit={handleCreateSkill} className="space-y-6">

                {submitMessage && (
                  <div className={`p-4 rounded-lg border ${submitMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    {submitMessage.text}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Skill (sem espaços)</label>
                    <input required value={skillName} onChange={e => setSkillName(e.target.value)} type="text" placeholder="ex: agendor_crm" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gatilhos (separados por vírgula)</label>
                    <input required value={skillTriggers} onChange={e => setSkillTriggers(e.target.value)} type="text" placeholder="ex: /crm, /agendor, vendas" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição Breve</label>
                  <input required value={skillDesc} onChange={e => setSkillDesc(e.target.value)} type="text" placeholder="Busca oportunidades no CRM do Agendor" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prompt da Ação / Instrução Base</label>
                  <p className="text-xs text-gray-500 mb-3">O que você digitar aqui será a instrução enviada à IA sempre que esta habilidade for ativada pelo usuário. Você pode usar templates com as chaves recebidas.</p>
                  <textarea
                    required
                    value={skillPrompt} onChange={e => setSkillPrompt(e.target.value)}
                    rows={6}
                    placeholder="Instrua a inteligência como proceder. Ex: Você é um consultor de vendas acessando o CRM. Identifique as necessidades no texto fornecido e devolva as 3 melhores oportunidades para esta semana..."
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-gray-800 bg-gray-50/50"
                  ></textarea>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button type="submit" disabled={isSubmitting} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    {isSubmitting ? 'Gerando Skill...' : 'Instanciar Habilidade'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'mcp' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">Ecosystem & MCP Services</h2>
            <p className="text-gray-500 mb-6">Integrações locais e servidores Model Context Protocol (MCP) atualmente conectados ao Doug.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mcp.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-gray-100">
                  Nenhum servidor MCP detectado no momento.
                </div>
              )}
              {mcp.map((server, idx) => (
                <div key={idx} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm shadow-blue-900/5 relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-2 h-full ${server.status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-gray-900 capitalize">{server.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-md ${server.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {server.status}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    Servidor de contexto fornecendo blocos de ferramentas e recursos.
                  </p>

                  {server.tools && server.tools.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ferramentas Expostas ({server.tools.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {server.tools.slice(0, 5).map((tool: any, i: number) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md border border-gray-200">
                            {tool.name}
                          </span>
                        ))}
                        {server.tools.length > 5 && (
                          <span className="px-2 py-1 bg-gray-50 text-gray-400 text-xs rounded-md">+{server.tools.length - 5}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
