-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nif" TEXT NOT NULL,
    "domicilio" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Vehiculo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transportistaEntityId" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "remolque" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vehiculo_transportistaEntityId_fkey" FOREIGN KEY ("transportistaEntityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Conductor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transportistaEntityId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Conductor_transportistaEntityId_fkey" FOREIGN KEY ("transportistaEntityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "entityId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DecaDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "docId" TEXT NOT NULL,
    "cargadorEntityId" TEXT NOT NULL,
    "transportistaEntityId" TEXT NOT NULL,
    "expedidorNombre" TEXT,
    "expedidorNif" TEXT,
    "expedidorDireccion" TEXT,
    "cuentaAnalitica" TEXT,
    "conductorId" TEXT,
    "conductorNombre" TEXT NOT NULL,
    "conductorDni" TEXT NOT NULL,
    "autorizacionEspecial" TEXT,
    "vehiculoId" TEXT,
    "matricula" TEXT NOT NULL,
    "remolque" TEXT,
    "observacionesCargador" TEXT,
    "observacionesTransportista" TEXT,
    "cargadorSignatureType" TEXT NOT NULL DEFAULT 'NONE',
    "cargadorSignerName" TEXT,
    "cargadorSignedAt" DATETIME,
    "transportistaSignatureType" TEXT NOT NULL DEFAULT 'NONE',
    "transportistaSignerName" TEXT,
    "transportistaSignedAt" DATETIME,
    "serviceStartDate" DATETIME,
    "serviceEndDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "disabledAt" DATETIME,
    "pdfPath" TEXT NOT NULL,
    "pdfSizeBytes" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "previousVersionId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    CONSTRAINT "DecaDocument_cargadorEntityId_fkey" FOREIGN KEY ("cargadorEntityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DecaDocument_transportistaEntityId_fkey" FOREIGN KEY ("transportistaEntityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DecaDocument_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "Conductor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DecaDocument_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DecaDocument_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "DecaDocument" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DecaDocument_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Envio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "decaDocumentId" TEXT NOT NULL,
    "origen" TEXT NOT NULL,
    "origenDireccion" TEXT,
    "destino" TEXT NOT NULL,
    "destinoDireccion" TEXT,
    "mercancia" TEXT NOT NULL,
    "bultos" INTEGER,
    "pesoKg" REAL,
    "volumenM3" REAL,
    "destinatarioNombre" TEXT,
    "destinatarioNif" TEXT,
    "destinatarioDireccion" TEXT,
    "destinatarioSignatureType" TEXT NOT NULL DEFAULT 'NONE',
    "destinatarioSignerName" TEXT,
    "destinatarioSignedAt" DATETIME,
    "fechaRealizacion" DATETIME,
    "fechaPrevistaEntrega" DATETIME,
    "fechaEfectivaEntrega" DATETIME,
    CONSTRAINT "Envio_decaDocumentId_fkey" FOREIGN KEY ("decaDocumentId") REFERENCES "DecaDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModificationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "decaDocumentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "changesJson" TEXT,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedByUserId" TEXT NOT NULL,
    CONSTRAINT "ModificationLog_decaDocumentId_fkey" FOREIGN KEY ("decaDocumentId") REFERENCES "DecaDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ModificationLog_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DecaDocument_docId_key" ON "DecaDocument"("docId");
