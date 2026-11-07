import axios from 'axios';

let api = (import.meta.env.VITE_API_URL || '/api').trim().replace(/\/$/, '');
if (!api.endsWith('/api')) {
  api = `${api}/api`;
}
const http = axios.create({ baseURL: api, timeout: 10000 });
export async function getPolicy() { const r = await http.get('/policy'); return r.data.data; }
export async function putPolicy(policy) { const r = await http.put('/policy', policy); return r.data.data; }
export async function getTickets(status) { const r = await http.get('/tickets' + (status ? '?status=' + status : '')); return r.data; }
export async function createTicket(body) { const r = await http.post('/tickets', body); return r.data.data; }
export async function patchStatus(id, status) { const r = await http.patch('/tickets/' + id + '/status', { status }); return r.data.data; }
export function errMsg(err) { return err.response?.data?.error?.message || 'Something went wrong. Is the API running?'; }
export default http;
