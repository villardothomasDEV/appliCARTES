import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
export class SqliteStore{
 constructor(filename){if(filename!==':memory:')mkdirSync(path.dirname(filename),{recursive:true});this.db=new DatabaseSync(filename);this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');if(!this.db.prepare("SELECT name FROM sqlite_master WHERE name='rooms'").get())this.db.exec(readFileSync(new URL('../migrations/0001_rooms.sql',import.meta.url),'utf8'));}
 async load(code){const row=this.db.prepare('SELECT data, version FROM rooms WHERE code=?').get(code);return row?{room:JSON.parse(row.data),version:row.version}:null;}
 async insert(room,now){return this.db.prepare('INSERT OR IGNORE INTO rooms(code,data,version,updated_at) VALUES(?,?,1,?)').run(room.code,JSON.stringify(room),now).changes===1;}
 async compareAndSwap(code,version,room,now){return this.db.prepare('UPDATE rooms SET data=?,version=version+1,updated_at=? WHERE code=? AND version=?').run(JSON.stringify(room),now,code,version).changes===1;}
 async cleanup(before,now=Date.now()){this.db.prepare('DELETE FROM rooms WHERE updated_at<?').run(before);this.db.prepare('DELETE FROM limits WHERE expires_at<?').run(now);}
 async limit(key,max,window,now){const result=this.db.prepare('INSERT INTO limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END, expires_at=CASE WHEN expires_at<=? THEN ? ELSE expires_at END RETURNING count').get(key,now+window,now,now,now+window);return result.count<=max;}
 close(){this.db.close();}
}
