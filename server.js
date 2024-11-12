const mysql = require('mysql2');
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();

// Middleware - es importante que estén ANTES de las rutas
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint para la página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Configuración de la base de datos
const connection = mysql.createConnection({
    host: 'mysql.railway.internal',
    user: 'root',
    password: 'RBVDQkkWaaCjamnQbHdIthIAdWkEGzlo',
    database: 'railway'
});

// Conexión a la base de datos
connection.connect((err) => {
    if (err) {
        console.error('Error conectando a la base de datos:', err);
        return;
    }
    console.log('Conexión exitosa a la base de datos');
});

// Ruta de prueba
app.get('/test', (req, res) => {
    res.json({ message: 'Servidor funcionando correctamente' });
});

// Ruta para obtener productos
app.get('/api/productos', (req, res) => {
    connection.query('SELECT * FROM productos', (err, results) => {
        if (err) {
            console.error('Error al obtener productos:', err);
            return res.status(500).json({ error: 'Error al obtener productos' });
        }
        res.json(results);
    });
});

// Ruta para procesar pedidos
app.post('/api/procesar-pedido', async (req, res) => {
    console.log('Recibido pedido:', req.body);

    const { cart, userPhone } = req.body;
    const EMAIL = 'julianortega278@gmail.com';

    if (!cart || !userPhone) {
        return res.status(400).json({
            success: false,
            error: 'Datos incompletos'
        });
    }

    try {
        await connection.promise().beginTransaction();

        // Actualizar el stock de cada producto
        for (const item of cart) {
            const updateQuery = 'UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?';
            const [result] = await connection.promise().execute(updateQuery, [
                item.quantity,
                item.id,
                item.quantity
            ]);

            if (result.affectedRows === 0) {
                throw new Error(`Stock insuficiente para el producto ${item.name}`);
            }
        }

        // Confirmar transacción
        await connection.promise().commit();

        // Configurar el transporte de correo con más detalles de debug
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // true para puerto 465, false para otros puertos
            auth: {
                user: EMAIL,
                pass: 'unbe tbyq fhwd xvey'
            },
            debug: true, // Habilitar logs de debug
            logger: true // Log de información adicional
        });

        // Verificar la conexión antes de enviar
        try {
            await transporter.verify();
            console.log('Conexión con el servidor de correo verificada');
        } catch (verifyError) {
            console.error('Error al verificar la conexión:', verifyError);
        }

        // Crear el contenido del correo
        const emailContent = await transporter.sendMail({
            from: `"Zharick's Shoes" <${EMAIL}>`,
            to: EMAIL,
            subject: 'Correo de prueba',
            text: 'Este es un correo de prueba.',
            html: '<p>Este es un correo de prueba.</p>'
        });
        

        // Enviar el correo con logs adicionales
        try {
            console.log('Intentando enviar correo...');
            const info = await transporter.sendMail({
                from: `"Zharick's Shoes" <${EMAIL}>`,
                to: EMAIL,
                subject: `Nuevo Pedido - Zharick's Shoes - ${new Date().toLocaleString()}`,
                text: emailContent,
                html: '<pre style="font-family: Arial, sans-serif;">${emailContent}</pre>'
            });

            console.log('Correo enviado exitosamente');
            console.log('Información de envío:', info);
        } catch (emailError) {
            console.error('Error detallado al enviar el correo:', emailError);
            // Imprimir más detalles del error
            if (emailError.response) {
                console.error('Respuesta del servidor:', emailError.response);
            }
        }

        res.json({
            success: true,
            message: 'Pedido procesado correctamente'
        });

    } catch (error) {
        console.error('Error en la transacción:', error);
        await connection.promise().rollback();
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Manejador de errores general
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        error: 'Error interno del servidor' 
    });
});

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});