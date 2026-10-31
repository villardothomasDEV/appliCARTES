export class D1Store{
 constructor(db){this.db=db;}
 async load(code){const row=await this.db.prepare('SELECT data, version FROM rooms WHERE code=?').bind(code).first();return row?{room:JSON.parse(row.data),version:row.version}:null;}
 async insert(room,now){const result=await this.db.prepare('INSERT OR IGNORE INTO rooms(code,data,version,updated_at) VALUES(?,?,1,?)').bind(room.code,JSON.stringify(room),now).run();return result.meta.changes===1;}
 async compareAndSwap(code,version,room,now){const result=await this.db.prepare('UPDATE rooms SET data=?,version=version+1,updated_at=? WHERE code=? AND version=?').bind(JSON.stringify(room),now,code,version).run();return result.meta.changes===1;}
 async cleanup(before,now=Date.now()){await this.db.prepare('DELETE FROM rooms WHERE updated_at<?').bind(before).run();await this.db.prepare('DELETE FROM limits WHERE expires_at<?').bind(now).run();}
 async limit(key,max,window,now){const result=await this.db.prepare('INSERT INTO limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END, expires_at=CASE WHEN expires_at<=? THEN ? ELSE expires_at END RETURNING count').bind(key,now+window,now,now,now+window).first();return result.count<=max;}
}
