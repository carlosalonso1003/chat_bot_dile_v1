const axios = require('axios');
const https = require('https');

const agent = new https.Agent({
    rejectUnauthorized: false
});

const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot')

const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MongoAdapter = require('@bot-whatsapp/database/mongo');
const { Console } = require('console');


/**
 * Declaramos las conexiones de Mongo
 */

const MONGO_DB_URI = 'mongodb://127.0.0.1:27017'
const MONGO_DB_NAME = 'db_bot'




/***FUNCITON DE IGNORAR CERTIFICADOS */
const axiosInstance = axios.create({
    httpsAgent: new https.Agent({  
        rejectUnauthorized: false
    })
});
/**
 * Aqui declaramos los flujos hijos, los flujos se declaran de atras para adelante, es decir que si tienes un flujo de este tipo:
 *
 *          Menu Principal
 *           - SubMenu 1
 *             - Submenu 1.1
 *           - Submenu 2
 *             - Submenu 2.1
 *
 * Primero declaras los submenus 1.1 y 2.1, luego el 1 y 2 y al final el principal.
 */

const flowSecundario = addKeyword(['2', 'siguiente']).addAnswer(['📄 Aquí tenemos el flujo secundario'])

/**FLUJOS DE 3 NIVEL */
const flowBuscarSocio =addKeyword(['Socio']).addAnswer(
    [],null,null,[]
)


const verificarDNI = async (dni, ape_pat) => {
    try {
        const response = await axiosInstance.post('https://localhost/api-json-user/api/buscarPersonal', {
            dni,
            ape_pat
        });

        return response.data;
    } catch (error) {
        console.error('Error al verificar el DNI:', error);
        return false;
    }
}

/**FUNCION PARA TRAER EL RIESGO */
const GetPerfilRiesgo = async (CUOTA_FIJA,TEA_INTERES,MONTO_PRESTAMO,EDAD) => {
        console.log(CUOTA_FIJA)
        console.log(TEA_INTERES)
        console.log(TEA_INTERES)
        console.log(TEA_INTERES)
    try {
        const response = await axiosInstance.post('/api-json-user/api/miPerfil', {
            CUOTA_FIJA,
            TEA_INTERES,
            MONTO_PRESTAMO,
            EDAD
        });
        
        return response.data;
    } catch (error) {
        console.error('Error al PERFIL DE RIESGO:', error);
        return false;
    }
}

const flowInfoCredito =addKeyword(['infoCredito']).addAnswer(
    [],null,null,[]
)

const flowInfoAhorro=addKeyword(['infoAhorro']).addAnswer(
    [],null,null,[]
)

const flowInfoSerSocio =addKeyword(['infoSerSocio']).addAnswer(
    [],null,null,[]
)

/*
const flowDocs = addKeyword(['doc', 'documentacion', 'documentación']).addAnswer(
    [
        '📄 Aquí encontras las documentación recuerda que puedes mejorarla',
        'https://bot-whatsapp.netlify.app/',
        '\n*2* Para siguiente paso.',
    ],
    null,
    null,
    [flowSecundario]
)
*/
const flowIngresoDatos=addKeyword(['si','Si','SI'])
.addAnswer(
    '¿Ingrese TEA_INTERES?',
    { capture: true },
    async (ctx, { state  }) => {
            console.log(ctx.body)
            await state.update({ tea_interes: ctx.body });
    }
).addAnswer(
    '¿Ingrese CUOTA_FIJA?',
    { capture: true },
    async (ctx, { state }) => {
        console.log(ctx.body)
        await state.update({ cuo_fija: ctx.body });
    }
).addAnswer(
    '¿Ingrese MONTO_PRESTAMO?',
    { capture: true },
    async (ctx, { state }) => {
        console.log(ctx.body)
        await state.update({ monto_p: ctx.body });
    }
).addAnswer(
    '¿Ingrese EDAD?',
    { capture: true },
    async (ctx, { state }) => {
        console.log(ctx.body)
        await state.update({ edad: ctx.body });
    }
).addAction(
    async (_, { flowDynamic, state }) => {
        const myState = await state.getMyState();
        const data=await GetPerfilRiesgo(myState.cuo_fija,myState.tea_interes,myState.monto_p,myState.edad)

        const riesgo=data[0]['riesgo']
        const con_ri=riesgo.toString()
        return await flowDynamic(`TU SCORE CRÉDITICIO ES: ${con_ri}`)
    }
)

const flowCalcuRiesgo = addKeyword(['cal', 'CAL']).addAnswer(
    [
        '🤖🤖 Es necesario conocer alguna información',
        'TEA_INTERES: rango de 12 a 98%',
        'EDAD: rango de 18 a 78 años',
        'MONTO PRESTAMO: rango de 500 a 4000 soles',
        'CUOTA FIJA: rango de 50 a 500 soles'
    ]
).addAnswer('desea continuar *si* o *no*',null,null,[flowIngresoDatos])
/*** */


const flowVerificadoUser=addKeyword('COLABORADOR_VERIFICADO')
.addAnswer(['✅ DNI verificado. Bienvenido, colaborador. ¿Qué deseas hacer ahora?'])
.addAnswer([
    'Escribe *cal* para la calculadora de riesgos',
    'Escribe *ver* para ver cuotas de un socio'
],null,null,[flowCalcuRiesgo])





/**FLUJO DE 2 NIVEL */


const flowSocio=addKeyword(['1']).addAnswer([
    'Ingrese su DNI para verificar que usted es un socio de la cooperativa'
],null,null,[flowBuscarSocio])

const flowNoSocio=addKeyword(['2']).addAnswer([
    'Que consulta desea conocer:',
    '*1* Para ver créditos',
    '*2* Para ver Cuentas de ahorro',
    '*3* como ser socio'
],null,null,[flowInfoCredito,flowInfoAhorro,flowInfoSerSocio])

const flowColaborador = addKeyword(['3']).addAnswer('🤖🤖 Es necesario que comprobemos tu identidad:')
    .addAnswer(
        '¿Cual es tu apellido paterno?',
        { capture: true },
        async (ctx, { state }) => {
            await state.update({ name: ctx.body });
        }
    )
    .addAnswer(
        '¿Cual es tu DNI?',
        { capture: true },
        async (ctx, { state }) => {
            await state.update({ age: ctx.body });
        }
    )
    .addAction(
        async (_, { flowDynamic,gotoFlow, state }) => {
            const myState = await state.getMyState();
            const data=await verificarDNI(myState.age,myState.name)
            console.log(data)
            if(data[0]['message']=='incorrecto'){
                await flowDynamic('Datos Incorrectos.')
                await flowDynamic('Escriba *volver para ingresar*')
            }else{
                console.log(data[0]['status'])
                await flowDynamic('Datos correctos')
                return gotoFlow(flowVerificadoUser)
            }
            
        },[flowVerificadoUser]
    )
    
/**FIN FLUJO 2 NIVEL */
/**VAMOS A PROBAR */



const flowPrincipal = addKeyword(['hola', 'ole','consulta','buen','dia','volver'])
    .addAnswer(
        [
            'Bienvenido soy *ESTRELLA* un bot que te ayudara a resolver tus dudas',
            '¿Escriba que tipo de persona eres?',
            '👉 *1* Para *Socio activo*',
            '👉 *2* Para *Aun no soy socio*',
            '👉 *3* Para *Colaborador*',
        ],
        null,
        null,
        [flowSocio, flowNoSocio, flowColaborador]
    )


const main = async () => {
    const adapterDB = new MongoAdapter({
        dbUri: MONGO_DB_URI,
        dbName: MONGO_DB_NAME,
    })
    const adapterFlow = createFlow([flowPrincipal,flowIngresoDatos])
    const adapterProvider = createProvider(BaileysProvider)
    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })
    QRPortalWeb()
}

main()
