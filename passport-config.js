const bcrypt= require('bcrypt')
const localStrategy= require('passport-local').Strategy

function initialize(passport,getuserbyemail,getuserbyid) {
    
    async function authenticateUser(email,password,done) {
        try {
            const user= await getuserbyemail(email)  

            if(user==null){
                return done(null,false, {message: "user not found"})
            }
            if(await bcrypt.compare(password,user.password)){
                return done(null,user)
            }else{
                return done(null,false,{message: "password incorrect"})
            }
            
        } catch (err) {
            console.log(err)
            return done(err,false,{message: "server side error"})
        }
    }

    passport.use(new localStrategy({usernameField: 'email', passwordField: 'password'}, authenticateUser))

    passport.serializeUser(function (user,done) {
        return done(null,user.id)
    })

    passport.deserializeUser(async function (id,done) {
        const user= await getuserbyid(id)
        return done(null,user)
    })
}

module.exports= initialize