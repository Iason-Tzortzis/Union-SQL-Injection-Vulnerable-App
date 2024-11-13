//Dependencies
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const cookieParser = require("cookie-parser");
var jwt = require("jsonwebtoken");
const ejsMate = require("ejs-mate");
const Str_Random = require("./generate_random_string.js");
require("dotenv").config({
  path: "/.env",
});
require("dotenv/config");

//App Setup
app.use(cookieParser());
app.use(express.urlencoded());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "static")));
app.use(bodyParser.urlencoded({ extended: true }));

//Generate secret key to sign the JWT tokens
const SECRET_KEY = String(Str_Random(32));
const port = process.env.PORT || 8000;

//Declare Database
const db = new sqlite3.Database(
  path.join(__dirname, "union-sql-injection.db"),
  function (error) {
    if (error) {
      return console.error(error.message);
    } else {
      console.log("Connection with Database has been established.");
    }
  }
);

//Create the tables for the agents and the administrators
function createTable() {
  db.exec(`
    DROP TABLE IF EXISTS agents;
    CREATE TABLE agents
    (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        password TEXT,
        role TEXT
    );
    
    DROP TABLE IF EXISTS administrators;
    CREATE TABLE administrators
    (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        password TEXT,
        role TEXT
    );`);
}

//Insert an MSP agent
function insertRow(username, password, role) {
  db.run("INSERT INTO agents (username, password, role) VALUES (?, ?, ?)", [
    username,
    password,
    role,
  ]);
  console.log("Data Inserted Successfully.");
}

//Insert an Administrator
function insertAdmin(username, password, role) {
  db.run(
    "INSERT INTO administrators (username, password, role) VALUES (?, ?, ?)",
    [username, password, role]
  );
  console.log("Data Inserted Successfully.");
}

//Setup database
function setupdb() {
  createTable();
  insertRow(process.env.DUMMY_USER, process.env.DUMMY_PASS, "agent");
  insertRow("Angel_Mendoza", Str_Random(8), "agent");
  insertRow("Theodore_Alletez", Str_Random(8), "agent");
  insertRow("Lucas_Allen", Str_Random(8), "agent");
  insertAdmin("Administrator", Str_Random(16), "admin");
  console.log("Database successfully initialized");
}

//Start database
setupdb();

//Routes
app.get("/", async function (req, res) {
  try {
    return res.render("login");
  } catch (e) {
    return res.send("Error 404");
  }
});

app.post("/", async function (req, res, next) {
  try {
    //Obtain inputted credentials from the request body
    let username = req.body.username;
    let password = req.body.password;

    //Fetch user records based on the input
    param1 = username;
    param2 = password;
    sql = `SELECT * FROM agents WHERE username= ? AND password= ? UNION SELECT * FROM administrators WHERE username= ? AND password= ?`;
    const result = await new Promise(async function (res, rej) {
      db.get(sql, [param1, param2, param1, param2], function (e, r) {
        if (e) {
          rej(e.message);
        } else {
          res(r);
        }
      });
    }).catch(function (e) {
      return res.redirect("/forbidden");
    });

    //if record we found generate JWT token and redirect to home page
    if (result) {
      let token_data = {
        username: result.username,
        role: result.role,
      };
      token = jwt.sign(token_data, SECRET_KEY, { expiresIn: "1h" });
      res.cookie("JWT", token);
      return res.redirect("/home");
    } else {
      return res.send("Invalid credentials submitted");
    }
  } catch (e) {
    next();
  }
});

app.get("/search", async function (req, res) {
  try {
    try {
      //Get token from the request object
      token = req.cookies.JWT;

      //if no token is found in the request object redirect to login page
      if (!token) {
        return res.redirect("/");
      }

      //Check if JWT token is valid
      var data = jwt.verify(token, SECRET_KEY);
    } catch (err) {
      return res.send("Missing valid JWT token");
    }
    //If token is valid render search page
    if (data) {
      return res.render("search", { found_username: false, data: {} });
    } else {
      return res.send("Missing valid JWT token");
    }
  } catch (e) {
    return res.send("Error 404");
  }
});

app.post("/search", async function (req, res) {
  try {
    try {
      //Get token from the request object
      token = req.cookies.JWT;

      //if no token is found in the request object redirect to login page
      if (!token) {
        return res.redirect("/");
      }

      //Check if JWT token is valid
      var data = jwt.verify(token, SECRET_KEY);
    } catch (err) {
      return res.send("Missing valid JWT token");
    }

    //If token is valid perform search functionality
    if (data) {
      //Get inputted username from the request body
      let username = req.body.username;

      //fetch all info based on the provided username
      const result = await new Promise(async function (res, rej) {
        db.all(
          `SELECT * FROM agents WHERE username='${username}'`,
          function (e, r) {
            if (e) {
              rej(e.message);
            } else {
              found = true;
              res(r);
            }
          }
        );
      }).catch(function (e) {
        return res.redirect("forbidden");
      });

      //If a user record wad found render search page with the results
      if (result) {
        return res.render("search", {
          found_username: found,
          data: result,
        });
      } else {
        return res.send("User with the supplied username was not found");
      }
    } else {
      return res.send("Error 404");
    }
  } catch (e) {
    next();
  }
});

app.get("/home", function (req, res) {
  try {
    try {
      //Get token from the request object
      token = req.cookies.JWT;

      //if no token is found in the request object redirect to login page
      if (!token) {
        return res.redirect("/");
      }

      //Check if JWT token is valid
      var data = jwt.verify(token, SECRET_KEY);
    } catch (err) {
      return res.send("Missing valid JWT token");
    }

    //If token is valid render home page
    if (data) {
      return res.render("home");
    } else {
      res.send("Missing valid JWT token");
    }
  } catch (err) {
    res.send("Error 404");
  }
});

app.get("/admin", async function (req, res) {
  try {
    try {
      //Get token from the request object
      token = req.cookies.JWT;

      //if no token is found in the request object redirect to login page
      if (!token) {
        return res.redirect("/");
      }

      //Check if JWT token is valid
      var data = jwt.verify(token, SECRET_KEY);
    } catch (err) {
      return res.send("Missing valid JWT token");
    }
    //Check if authenticated user is Authorized to access Admin route
    if (data.role == "admin") {
      return res.render("admin");
    } else {
      return res.render("forbidden");
    }
  } catch (err) {
    res.send("Error 404");
  }
});

app.get("/test", function (req, res) {
  try {
    return res.render("test", {
      dummy_user: process.env.DUMMY_USER,
      dummy_pass: process.env.DUMMY_PASS,
    });
  } catch (err) {
    res.send("Error 404");
  }
});

app.get("/forbidden", function (req, res) {
  return res.render("forbidden");
});

app.get("/logout", function (req, res) {
  res.clearCookie("JWT");
  return res.redirect("/");
});

app.get("*", function (req, res) {
  return res.redirect("/");
});

//Start App
app.listen(port, function () {
  console.log(`Serving on Port ${port}`);
});
