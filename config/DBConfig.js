import DB from "./DB.js";
import { Config } from "./Init.js";

class DBConfig extends DB {
    constructor(connect, DBType, DBName, DBUser, DBHost, DBPass, DBPort) {
        super();
        if (connect) {
            if (DBType && DBName && (DBUser || DBUser == "" || DBUser !== undefined) && DBHost && (DBPass || DBPass == "" || DBPass !== undefined) && DBPort) {
                this.setDBType(DBType);
                this.setDBName(DBName);
                this.setDBUser(DBUser);
                this.setDBHost(DBHost);
                this.setDBPass(DBPass);
                this.setDBPort(DBPort);
            }

            var DBType = this.getDBType();
            var DBName = this.getDBName();
            var DBUser = this.getDBUser();
            var DBHost = this.getDBHost();
            var DBPass = this.getDBPass();
            var DBPort = this.getDBPort();

            //Main Database connection
            this.setDBType(DBType);
            this.setDBName(DBName);
            this.setDBUser(DBUser);
            this.setDBHost(DBHost);
            this.setDBPass(DBPass);
            this.setDBPort(DBPort);
            this.Connect();
        }
    }
}

export default DBConfig;
