; ================================================================
; INSTALADOR WIZARD - SERVICIO DE SINCRONIZACIÓN FIREBIRD
; ================================================================
; Este script de Inno Setup crea un instalador profesional con
; wizard que guía al usuario paso a paso en la instalación.
;
; REQUISITOS PARA COMPILAR:
;   - Inno Setup 6.x (https://jrsoftware.org/isdl.php)
;   - Archivos compilados en carpeta dist/
;   - Archivo .env.encrypted en la raíz
;
; PARA COMPILAR:
;   1. Abrir este archivo con Inno Setup Compiler
;   2. Presionar F9 o Build > Compile
;   3. El instalador se generará en Output/
; ================================================================

[Setup]
; Información de la aplicación
AppName=Servicio de Sincronización Firebird
AppVersion=1.0.0
AppPublisher=Tu Empresa
AppPublisherURL=https://tu-sitio-web.com
AppSupportURL=https://tu-sitio-web.com/soporte
AppUpdatesURL=https://tu-sitio-web.com/actualizaciones

; Configuración del instalador
DefaultDirName=C:\Services\SyncFirebird
DefaultGroupName=Sincronización Firebird
AllowNoIcons=yes
OutputDir=Output
OutputBaseFilename=InstaladorSyncFirebird-v1.0.0
SetupIconFile=icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern

; Requisitos del sistema
MinVersion=6.1sp1
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog

; NOTA: Este instalador requiere Node.js instalado en el sistema
; Se verificará durante la instalación

; Idioma
ShowLanguageDialog=no

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Messages]
spanish.WelcomeLabel2=Este asistente le guiará en la instalación del Servicio de Sincronización Firebird en su equipo.%n%nSe recomienda cerrar todas las demás aplicaciones antes de continuar.
spanish.FinishedHeadingLabel=Instalación completada
spanish.FinishedLabelNoIcons=La instalación se ha completado exitosamente.%n%nEl servicio ha sido instalado y está en ejecución.

[Files]
; Ejecutable principal del servicio (compilado con Node.js SEA)
Source: "..\dist\supabase-firebird-sync.exe"; DestDir: "{app}"; Flags: ignoreversion

; NSSM - Non-Sucking Service Manager (para convertir el .exe en servicio de Windows)
Source: "nssm.exe"; DestDir: "{app}"; Flags: ignoreversion

; Firebird Client DLL (necesaria para conectarse a Firebird 2.5)
Source: "fbclient.dll"; DestDir: "{app}"; Flags: ignoreversion

; Archivo de configuración encriptado
Source: "..\.env.encrypted"; DestDir: "{app}"; Flags: ignoreversion

; Documentación
Source: "..\docs\GUIA_INSTALACION_IMPLEMENTADORES.md"; DestDir: "{app}\docs"; Flags: ignoreversion
Source: "..\docs\REFERENCIA_RAPIDA_INSTALACION.md"; DestDir: "{app}\docs"; Flags: ignoreversion
Source: "..\docs\FAQ_IMPLEMENTADORES.md"; DestDir: "{app}\docs"; Flags: ignoreversion

[Dirs]
; Crear carpetas necesarias
Name: "{app}\logs"; Permissions: users-full
Name: "{app}\.cache"; Permissions: users-full

[Code]
var
  ServiceNamePage: TInputQueryWizardPage;
  EnvPasswordPage: TInputQueryWizardPage;
  CachePasswordPage: TInputQueryWizardPage;
  ProgressPage: TOutputProgressWizardPage;

// ================================================================
// INICIALIZACIÓN DEL WIZARD
// ================================================================
procedure InitializeWizard;
begin
  // Página 1: Nombre del servicio
  ServiceNamePage := CreateInputQueryPage(wpSelectDir,
    'Nombre del Servicio', 
    'Configure el nombre del servicio de Windows',
    'Para instalar múltiples instancias en la misma máquina, cada servicio debe tener un nombre único.' + #13#10 + #13#10 +
    'Ingrese el nombre del servicio (solo letras, números, guiones y guiones bajos):');
  ServiceNamePage.Add('Nombre del servicio:', False);
  ServiceNamePage.Values[0] := 'SupabaseFirebirdSync';

  // Página 2: Contraseña del .env
  EnvPasswordPage := CreateInputQueryPage(ServiceNamePage.ID,
    'Contraseña para acceder al sistema', 
    'Contraseña para acceder al sistema',
    'Esta contraseña fue proporcionada por el administrador del sistema.' + #13#10 + #13#10 +
    'IMPORTANTE: Esta es la misma contraseña que usará para acceder a la interfaz web.');
  EnvPasswordPage.Add('Contraseña de ingreso al sistema:', True); // True = campo de contraseña

  // Página 3: Contraseña del caché
  CachePasswordPage := CreateInputQueryPage(EnvPasswordPage.ID,
    'Contraseña del Caché', 
    'Contraseña para encriptar el caché local',
    'Esta contraseña se usa para encriptar la configuración local descargada desde la nube.' + #13#10 + #13#10 +
    'IMPORTANTE: Use la misma contraseña que ingresó anteriormente.');
  CachePasswordPage.Add('Contraseña de ingreso al sistema:', True); // True = campo de contraseña
end;

// ================================================================
// FUNCIÓN AUXILIAR PARA EXPRESIONES REGULARES
// ================================================================
function RegExpMatch(const S, Pattern: String): Boolean;
var
  I: Integer;
  C: Char;
  IsValid: Boolean;
begin
  Result := True;
  IsValid := True;

  // Validación simple para ^[a-zA-Z0-9_-]+$
  if Length(S) = 0 then
  begin
    Result := False;
    Exit;
  end;

  for I := 1 to Length(S) do
  begin
    C := S[I];
    if not (((C >= 'a') and (C <= 'z')) or
            ((C >= 'A') and (C <= 'Z')) or
            ((C >= '0') and (C <= '9')) or
            (C = '_') or (C = '-')) then
    begin
      IsValid := False;
      Break;
    end;
  end;

  Result := IsValid;
end;

// ================================================================
// VALIDACIONES
// ================================================================
function NextButtonClick(CurPageID: Integer): Boolean;
var
  ServiceName: String;
begin
  Result := True;
  
  // Validar nombre del servicio
  if CurPageID = ServiceNamePage.ID then
  begin
    ServiceName := Trim(ServiceNamePage.Values[0]);
    
    if ServiceName = '' then
    begin
      MsgBox('El nombre del servicio no puede estar vacío.', mbError, MB_OK);
      Result := False;
      Exit;
    end;
    
    // Validar caracteres permitidos (solo letras, números, guiones y guiones bajos)
    if not RegExpMatch(ServiceName, '^[a-zA-Z0-9_-]+$') then
    begin
      MsgBox('El nombre del servicio solo puede contener letras, números, guiones (-) y guiones bajos (_).', mbError, MB_OK);
      Result := False;
      Exit;
    end;
  end;

  // Validar contraseña del .env
  if CurPageID = EnvPasswordPage.ID then
  begin
    if Trim(EnvPasswordPage.Values[0]) = '' then
    begin
      MsgBox('La contraseña del .env es requerida.' + #13#10 + #13#10 +
             'Esta contraseña fue proporcionada por el administrador del sistema.', mbError, MB_OK);
      Result := False;
      Exit;
    end;
  end;

  // Validar contraseña del caché
  if CurPageID = CachePasswordPage.ID then
  begin
    if Trim(CachePasswordPage.Values[0]) = '' then
    begin
      MsgBox('La contraseña del caché es requerida.' + #13#10 + #13#10 +
             'Use la misma contraseña que ingresó para el .env.', mbError, MB_OK);
      Result := False;
      Exit;
    end;

    // Advertencia si las contraseñas son diferentes
    if EnvPasswordPage.Values[0] <> CachePasswordPage.Values[0] then
    begin
      if MsgBox('ADVERTENCIA: Las contraseñas ingresadas son diferentes.' + #13#10 + #13#10 +
                'Se recomienda usar la misma contraseña para ambos campos.' + #13#10 + #13#10 +
                '¿Desea continuar de todas formas?', mbConfirmation, MB_YESNO) = IDNO then
      begin
        Result := False;
        Exit;
      end;
    end;
  end;
end;

// ================================================================
// INSTALACIÓN DEL SERVICIO
// ================================================================
procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
  ServiceName: String;
  EnvPassword: String;
  CachePassword: String;
  AppPath: String;
  ExePath: String;
  ErrorMsg: String;
begin
  if CurStep = ssPostInstall then
  begin
    // Obtener valores ingresados
    ServiceName := Trim(ServiceNamePage.Values[0]);
    EnvPassword := EnvPasswordPage.Values[0];
    CachePassword := CachePasswordPage.Values[0];
    AppPath := ExpandConstant('{app}');
    ExePath := AppPath + '\supabase-firebird-sync.exe';

    // Crear página de progreso
    ProgressPage := CreateOutputProgressPage('Instalando Servicio',
      'Por favor espere mientras se instala y configura el servicio...');
    ProgressPage.Show;

    try
      // Paso 1: Instalar servicio de Windows usando NSSM
      ProgressPage.SetText('Instalando servicio de Windows con NSSM...', '');
      ProgressPage.SetProgress(1, 5);

      // NSSM (Non-Sucking Service Manager) convierte cualquier ejecutable en un servicio de Windows
      // Esto es necesario porque el ejecutable compilado con pkg no puede funcionar como servicio directamente

      // IMPORTANTE: Verificar que NSSM existe antes de usarlo
      if not FileExists(ExpandConstant('{app}') + '\nssm.exe') then
      begin
        MsgBox('ERROR: nssm.exe no se encuentra en ' + ExpandConstant('{app}'), mbError, MB_OK);
        ProgressPage.Hide;
        Exit;
      end;

      // Ejecutar NSSM install
      if not Exec(ExpandConstant('{app}') + '\nssm.exe',
                  'install "' + ServiceName + '" "' + ExePath + '"',
                  '', SW_SHOW, ewWaitUntilTerminated, ResultCode) then
      begin
        ErrorMsg := 'Error al instalar el servicio de Windows con NSSM.' + #13#10 +
                    'Código de error: ' + IntToStr(ResultCode) + #13#10 + #13#10 +
                    'Comando ejecutado:' + #13#10 +
                    ExpandConstant('{app}') + '\nssm.exe install "' + ServiceName + '" "' + ExePath + '"' + #13#10 + #13#10 +
                    'Posibles causas:' + #13#10 +
                    '- Ya existe un servicio con ese nombre' + #13#10 +
                    '- No tiene permisos de administrador';
        MsgBox(ErrorMsg, mbError, MB_OK);
        ProgressPage.Hide;
        Exit;
      end;

      // Verificar que el servicio fue creado
      if ResultCode <> 0 then
      begin
        MsgBox('NSSM install retornó código: ' + IntToStr(ResultCode), mbError, MB_OK);
        ProgressPage.Hide;
        Exit;
      end;

      // Paso 2: Configurar nombre de visualización del servicio
      ProgressPage.SetText('Configurando nombre del servicio...', '');
      ProgressPage.SetProgress(2, 5);

      Exec(ExpandConstant('{app}') + '\nssm.exe',
           'set "' + ServiceName + '" DisplayName "Servicio de Sincronización Firebird"',
           '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

      // Configurar descripción del servicio
      Exec(ExpandConstant('{app}') + '\nssm.exe',
           'set "' + ServiceName + '" Description "Sincroniza datos desde Firebird hacia la nube automáticamente"',
           '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

      // Paso 3: Configurar directorio de trabajo y inicio automático
      ProgressPage.SetText('Configurando directorio de trabajo...', '');
      ProgressPage.SetProgress(3, 5);

      // Configurar directorio de trabajo (donde está el .env.encrypted)
      Exec(ExpandConstant('{app}') + '\nssm.exe',
           'set "' + ServiceName + '" AppDirectory "' + ExpandConstant('{app}') + '"',
           '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

      // Configurar inicio automático
      Exec(ExpandConstant('{app}') + '\nssm.exe',
           'set "' + ServiceName + '" Start SERVICE_AUTO_START',
           '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

      // Paso 4: Configurar variables de entorno del servicio
      ProgressPage.SetText('Configurando variables de entorno del servicio...', '');
      ProgressPage.SetProgress(4, 5);

      // NSSM no funciona bien con AppEnvironmentExtra desde línea de comandos
      // Configurar directamente en el registro como lo hace NSSM internamente
      if not Exec('powershell.exe',
                  '-NoProfile -Command "Set-ItemProperty -Path ''HKLM:\SYSTEM\CurrentControlSet\Services\' + ServiceName + '\Parameters'' -Name ''AppEnvironmentExtra'' -Value @(''ENV_PASSWORD=' + EnvPassword + ''', ''CONFIG_CACHE_PASSWORD=' + CachePassword + ''') -Type MultiString"',
                  '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
      begin
        ErrorMsg := 'Error al configurar variables de entorno.' + #13#10 +
                    'Código de error: ' + IntToStr(ResultCode);
        MsgBox(ErrorMsg, mbError, MB_OK);
        ProgressPage.Hide;
        Exit;
      end;

      // Paso 5: Iniciar servicio
      ProgressPage.SetText('Iniciando servicio...', '');
      ProgressPage.SetProgress(5, 5);

      Sleep(1000); // Esperar 1 segundo antes de iniciar

      if not Exec(ExpandConstant('{app}') + '\nssm.exe',
                  'start "' + ServiceName + '"',
                  '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
      begin
        // No es crítico si falla el inicio, el usuario puede iniciarlo manualmente
        MsgBox('El servicio fue instalado pero no se pudo iniciar automáticamente.' + #13#10 + #13#10 +
               'Puede iniciarlo manualmente desde:' + #13#10 +
               '1. Presione Win+R' + #13#10 +
               '2. Escriba: services.msc' + #13#10 +
               '3. Busque el servicio "' + ServiceName + '"' + #13#10 +
               '4. Clic derecho > Iniciar', mbInformation, MB_OK);
      end;

    finally
      ProgressPage.Hide;
    end;
  end;
end;

// ================================================================
// DESINSTALACIÓN DEL SERVICIO
// ================================================================
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  ResultCode: Integer;
  NssmPath: String;
  TempFile: String;
  Services: TArrayOfString;
  I: Integer;
  ServiceLine: String;
begin
  if CurUninstallStep = usUninstall then
  begin
    NssmPath := ExpandConstant('{app}') + '\nssm.exe';

    // Crear archivo temporal para la lista de servicios
    TempFile := ExpandConstant('{tmp}') + '\services.txt';

    // Obtener lista de todos los servicios que contienen "SupabaseFirebird" o "SyncFirebird"
    Exec('powershell.exe',
         '-NoProfile -Command "Get-Service | Where-Object {$_.Name -like ''*SupabaseFirebird*'' -or $_.Name -like ''*SyncFirebird*''} | Select-Object -ExpandProperty Name | Out-File -FilePath ''' + TempFile + ''' -Encoding ASCII"',
         '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

    // Leer el archivo y procesar cada servicio
    if LoadStringsFromFile(TempFile, Services) then
    begin
      for I := 0 to GetArrayLength(Services) - 1 do
      begin
        ServiceLine := Trim(Services[I]);
        if ServiceLine <> '' then
        begin
          Log('Deteniendo servicio: ' + ServiceLine);

          // Detener el servicio
          Exec(NssmPath, 'stop "' + ServiceLine + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
          Sleep(1000);

          // Eliminar el servicio
          Log('Eliminando servicio: ' + ServiceLine);
          Exec(NssmPath, 'remove "' + ServiceLine + '" confirm', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
          Sleep(500);
        end;
      end;
    end;

    // Eliminar archivo temporal
    DeleteFile(TempFile);
  end;
end;

