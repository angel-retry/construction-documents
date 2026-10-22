import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {appMode,supabaseConfig} from './lib/config';
export async function proxy(request:NextRequest) {
 const config=supabaseConfig();
 let response=NextResponse.next({request});
 if(appMode()==='supabase' && config){
 const client=createServerClient(config.url,config.key,{cookies:{getAll(){return request.cookies.getAll();},setAll(values){values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});values.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
 await client.auth.getClaims();
 }
 response.headers.set('Cache-Control','private, no-store, max-age=0');
 return response;
}
export const config={matcher:['/','/login','/projects/:path*','/download/:path*']};
