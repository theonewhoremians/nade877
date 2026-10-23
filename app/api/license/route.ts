import { cookies } from 'next/headers';
import { licenseCall, localPreview, sameOrigin, verifySession } from '@/lib/licensing';
export async function GET(request:Request){
 if(localPreview)return Response.json({license:{active:true,plan:'Local Preview'}},{headers:{'Cache-Control':'no-store'}});
 const license=await verifySession();
 if(license)return Response.json({license},{headers:{'Cache-Control':'no-store'}});
 const cookieStore=await cookies();
 const accessCode=cookieStore.get('tiktok-access-code')?.value;
 const deviceId=cookieStore.get('tiktok-device-id')?.value;
 if(!accessCode||!deviceId)return Response.json({error:'Please activate your access code.'},{status:401,headers:{'Cache-Control':'no-store'}});
 try{
  const session=await licenseCall('refresh-license',{accessCode,deviceId,appVersion:'tiktok-studio-1.0'});
  cookieStore.set('tiktok-license',session.token,{httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'strict',path:'/',maxAge:86400});
  return Response.json({license:session.license},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Please activate your access code.'},{status:401,headers:{'Cache-Control':'no-store'}});}
}
export async function POST(request:Request){if(!sameOrigin(request))return Response.json({error:'Invalid request origin.'},{status:403});try{const {accessCode,deviceId}=await request.json() as {accessCode:string;deviceId:string};if(!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(accessCode)||typeof deviceId!=='string'||deviceId.length<16||deviceId.length>256)return Response.json({error:'Enter a valid access code.'},{status:400});const session=await licenseCall('activate-license',{accessCode,deviceId,appVersion:'tiktok-studio-1.0'});const cookieOptions={httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'strict' as const,path:'/',maxAge:86400};const cookieStore=await cookies();cookieStore.set('tiktok-license',session.token,cookieOptions);cookieStore.set('tiktok-access-code',accessCode,{...cookieOptions,maxAge:31536000});cookieStore.set('tiktok-device-id',deviceId,{...cookieOptions,maxAge:31536000});return Response.json({license:session.license});}catch(e){return Response.json({error:e instanceof Error?e.message:'Activation failed.'},{status:400});}}
export async function DELETE(r:Request){if(!sameOrigin(r))return new Response(null,{status:403});const cookieStore=await cookies();for(const name of ['tiktok-license','tiktok-access-code','tiktok-device-id'])cookieStore.delete(name);return Response.json({ok:true});}

