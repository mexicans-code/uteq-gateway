const express = require('express');
const router = express.Router();

// ===============================
// ==============
// ENDPOINTS PARA PERSONAL ACADÉMICO
// =============================================

// 1. GET /api/personal - Obtener todo el personal
router.get('/personal', async (req, res) => {
    try {
        console.log('📥 Obteniendo lista de personal...');
        
        const personal = await Personal.find()
            .sort({ fechaIngreso: -1 }); // Ordenar por fecha de ingreso descendente
        
        console.log(`✅ Personal encontrado: ${personal.length}`);
        
        res.json({
         
            success: true,
            count: personal.length,
            data: personal
        });
    } catch (error) {
        console.error('❌ Error al obtener personal:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el personal',
            error: error.message
        });
    }
});

// 2. GET /api/personal/:id - Obtener personal por ID
router.get('/personal/:id', async (req, res) => {
    try {
        console.log(`📥 Obteniendo personal con ID: ${req.params.id}`);
        
        const personal = await Personal.findById(req.params.id);
        
        if (!personal) {
            return res.status(404).json({
                success: false,
                message: 'Personal no encontrado'
            });
        }
        
        console.log(`✅ Personal encontrado: ${personal.nombre}`);
        
        res.json({
            success: true,
            data: personal
        });
    } catch (error) {
        console.error('❌ Error al obtener personal:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el personal',
            error: error.message
        });
    }
});

// 3. POST /api/personal - Crear nuevo personal
router.post('/personal', async (req, res) => {
    try {
        console.log('➕ Creando nuevo personal:', req.body);
        
        const {
            numeroEmpleado,
            nombre,
            apellidoPaterno,
            apellidoMaterno,
            email,
            telefono,
            departamento,
            cargo,
            fechaIngreso,
            estatus
        } = req.body;
        
        // Validaciones
        if (!numeroEmpleado || !nombre || !apellidoPaterno || !email || !departamento || !cargo) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos requeridos: numeroEmpleado, nombre, apellidoPaterno, email, departamento, cargo'
            });
        }
        
        // Verificar si ya existe el número de empleado
        const existingPersonal = await Personal.findOne({ numeroEmpleado });
        if (existingPersonal) {
            return res.status(400).json({
                success: false,
                message: 'El número de empleado ya existe'
            });
        }
        
        // Verificar si ya existe el email
        const existingEmail = await Personal.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: 'El email ya está registrado'
            });
        }
        
        // Crear nuevo personal
        const newPersonal = new Personal({
            numeroEmpleado,
            nombre,
            apellidoPaterno,
            apellidoMaterno,
            email,
            telefono,
            departamento,
            cargo,
            fechaIngreso: fechaIngreso || new Date(),
            estatus: estatus || 'activo'
        });
        
        const savedPersonal = await newPersonal.save();
        
        console.log(`✅ Personal creado: ${savedPersonal.nombre}`);
        
        res.status(201).json({
            success: true,
            message: 'Personal creado exitosamente',
            data: savedPersonal
        });
    } catch (error) {
        console.error('❌ Error al crear personal:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear el personal',
            error: error.message
        });
    }
});

// 4. PUT /api/personal/:id - Actualizar personal
router.put('/personal/:id', async (req, res) => {
    try {
        console.log(`📝 Actualizando personal ID: ${req.params.id}`);
        
        const {
            numeroEmpleado,
            nombre,
            apellidoPaterno,
            apellidoMaterno,
            email,
            telefono,
            departamento,
            cargo,
            fechaIngreso,
            estatus
        } = req.body;
        
        // Validaciones
        if (!numeroEmpleado || !nombre || !apellidoPaterno || !email || !departamento || !cargo) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos requeridos'
            });
        }
        
        // Verificar si existe el personal
        const existingPersonal = await Personal.findById(req.params.id);
        if (!existingPersonal) {
            return res.status(404).json({
                success: false,
                message: 'Personal no encontrado'
            });
        }
        
        // Verificar si el número de empleado no está siendo usado por otro
        const duplicateNumero = await Personal.findOne({ 
            numeroEmpleado, 
            _id: { $ne: req.params.id } 
        });
        if (duplicateNumero) {
            return res.status(400).json({
                success: false,
                message: 'El número de empleado ya existe'
            });
        }
        
        // Verificar si el email no está siendo usado por otro
        const duplicateEmail = await Personal.findOne({ 
            email, 
            _id: { $ne: req.params.id } 
        });
        if (duplicateEmail) {
            return res.status(400).json({
                success: false,
                message: 'El email ya está registrado'
            });
        }
        
        // Actualizar personal
        const updatedPersonal = await Personal.findByIdAndUpdate(
            req.params.id,
            {
                numeroEmpleado,
                nombre,
                apellidoPaterno,
                apellidoMaterno,
                email,
                telefono,
                departamento,
                cargo,
                fechaIngreso,
                estatus
            },
            { new: true, runValidators: true }
        );
        
        console.log(`✅ Personal actualizado: ${updatedPersonal.nombre}`);
        
        res.json({
            success: true,
            message: 'Personal actualizado exitosamente',
            data: updatedPersonal
        });
    } catch (error) {
        console.error('❌ Error al actualizar personal:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el personal',
            error: error.message
        });
    }
});

// 5. DELETE /api/personal/:id - Eliminar personal
router.delete('/personal/:id', async (req, res) => {
    try {
        console.log(`🗑️ Eliminando personal ID: ${req.params.id}`);
        
        const personal = await Personal.findById(req.params.id);
        if (!personal) {
            return res.status(404).json({
                success: false,
                message: 'Personal no encontrado'
            });
        }
        
        await Personal.findByIdAndDelete(req.params.id);
        
        console.log(`✅ Personal eliminado: ${personal.nombre}`);
        
        res.json({
            success: true,
            message: 'Personal eliminado exitosamente'
        });
    } catch (error) {
        console.error('❌ Error al eliminar personal:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el personal',
            error: error.message
        });
    }
});

// 6. PATCH /api/personal/:id/estatus - Cambiar estatus (activo/inactivo)
router.patch('/personal/:id/estatus', async (req, res) => {
    try {
        console.log(`🔄 Cambiando estatus del personal ID: ${req.params.id}`);
        
        const { estatus } = req.body;
        
        if (!estatus || !['activo', 'inactivo'].includes(estatus)) {
            return res.status(400).json({
                success: false,
                message: 'Estatus debe ser "activo" o "inactivo"'
            });
        }
        
        const personal = await Personal.findById(req.params.id);
        if (!personal) {
            return res.status(404).json({
                success: false,
                message: 'Personal no encontrado'
            });
        }
        
        personal.estatus = estatus;
        await personal.save();
        
        console.log(`✅ Estatus cambiado a: ${estatus}`);
        
        res.json({
            success: true,
            message: `Personal ${estatus === 'activo' ? 'activado' : 'desactivado'} exitosamente`,
            data: personal
        });
    } catch (error) {
        console.error('❌ Error al cambiar estatus:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cambiar el estatus',
            error: error.message
        });
    }
});

// 7. GET /api/personal/estadisticas - Obtener estadísticas del personal
router.get('/personal/estadisticas', async (req, res) => {
    try {
        console.log('📊 Obteniendo estadísticas del personal...');
        
        const [totalPersonal, activosCount, inactivosCount, departamentos] = await Promise.all([
            Personal.countDocuments(),
            Personal.countDocuments({ estatus: 'activo' }),
            Personal.countDocuments({ estatus: 'inactivo' }),
            Personal.aggregate([
                { $group: { _id: '$departamento', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ])
        ]);
        
        const estadisticas = {
            total: totalPersonal,
            activos: activosCount,
            inactivos: inactivosCount,
            porcentajeActivos: totalPersonal > 0 ? Math.round((activosCount / totalPersonal) * 100) : 0,
            departamentos: departamentos
        };
        
        console.log('✅ Estadísticas obtenidas:', estadisticas);
        
        res.json({
            success: true,
            data: estadisticas
        });
    } catch (error) {
        console.error('❌ Error al obtener estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
});

// 8. POST /api/personal/seed - Crear datos de prueba
router.post('/personal/seed', async (req, res) => {
    try {
        console.log('🌱 Creando datos de prueba para personal...');
        
        // Verificar si ya hay datos
        const existingCount = await Personal.countDocuments();
        if (existingCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ya existen datos de personal en la base de datos'
            });
        }
        
        const personalPrueba = [
            {
                numeroEmpleado: '001',
                nombre: 'María Elena',
                apellidoPaterno: 'García',
                apellidoMaterno: 'López',
                email: 'maria.garcia@universidad.edu',
                telefono: '4421234567',
                departamento: 'Ingeniería',
                cargo: 'Profesora Titular',
                fechaIngreso: new Date('2020-01-15'),
                estatus: 'activo'
            },
            {
                numeroEmpleado: '002',
                nombre: 'Carlos',
                apellidoPaterno: 'Rodríguez',
                apellidoMaterno: 'Hernández',
                email: 'carlos.rodriguez@universidad.edu',
                telefono: '4429876543',
                departamento: 'Matemáticas',
                cargo: 'Profesor Investigador',
                fechaIngreso: new Date('2019-08-20'),
                estatus: 'activo'
            },
            {
                numeroEmpleado: '003',
                nombre: 'Ana',
                apellidoPaterno: 'Martínez',
                apellidoMaterno: 'Sánchez',
                email: 'ana.martinez@universidad.edu',
                telefono: '4425551234',
                departamento: 'Psicología',
                cargo: 'Profesora Asociada',
                fechaIngreso: new Date('2021-03-10'),
                estatus: 'activo'
            },
            {
                numeroEmpleado: '004',
                nombre: 'Luis',
                apellidoPaterno: 'Fernández',
                apellidoMaterno: 'Ruiz',
                email: 'luis.fernandez@universidad.edu',
                telefono: '4427778888',
                departamento: 'Física',
                cargo: 'Profesor Asociado',
                fechaIngreso: new Date('2022-01-10'),
                estatus: 'inactivo'
            },
            {
                numeroEmpleado: '005',
                nombre: 'Isabella',
                apellidoPaterno: 'Torres',
                apellidoMaterno: 'Silva',
                email: 'isabella.torres@universidad.edu',
                telefono: '4423334444',
                departamento: 'Química',
                cargo: 'Profesora Titular',
                fechaIngreso: new Date('2018-09-15'),
                estatus: 'activo'
            }
        ];
        
        const personalCreado = await Personal.insertMany(personalPrueba);
        
        console.log(`✅ Datos de prueba creados: ${personalCreado.length} registros`);
        
        res.status(201).json({
            success: true,
            message: 'Datos de prueba creados exitosamente',
            count: personalCreado.length,
            data: personalCreado
        });
    } catch (error) {
        console.error('❌ Error al crear datos de prueba:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear datos de prueba',
            error: error.message
        });
    }
});

module.exports = router;