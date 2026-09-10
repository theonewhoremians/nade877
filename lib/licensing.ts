import { cookies } from 'next/headers';
import { licenseConfig } from './license-config';
export async function licenseCall(name: string, body?: unknown, token?: string, adminKey?: string, method = 'POST') {
 if (!licenseConfig.url || !licenseConfig.key) throw new Error('License service is not configured.');
 const r = await fetch(`${licenseConfig.url}/functions/v1/${name}`, { method, headers: { 'Content-Type':'application/json', apikey:licenseConfig.key, Authorization:`Bearer ${token || licenseConfig.key}`, ...(adminKey ? {'x-admin-key':adminKey}: {}) }, ...(method !== 'GET' ? {body:JSON.stringify(body)}:{}), cache:'no-store', signal:AbortSignal.timeout(15000) });
 const data=await r.json() as {error?:string;token:string;active:boolean;license:unknown;licenses:unknown[]}; if(!r.ok || data.error) throw new Error(data.error || 'License request failed.');return data;
}
export async function verifySession() {const token=(await cookies()).get('tiktok-license')?.value;if(!token)return null;try {const l=await licenseCall('license-status',undefined,token,undefined,'GET');return l.active?l:null;}catch{return null;}}
export function sameOrigin(r:Request){return r.headers.get('origin')===new URL(r.url).origin;}

