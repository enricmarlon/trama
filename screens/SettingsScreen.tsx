import { useContext, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import ActionButton from '../components/ActionButton';
import SectionTitle from '../components/SectionTitle';
import { ThemeContext } from '../theme/ThemeContext';
import type { CategoryKind, DriveBackupSettings } from '../types';

type SettingsScreenProps = {
  productCategories: string[];
  supplyCategories: string[];
  employees: string[];
  onAddCategory: (kind: CategoryKind, name: string) => boolean;
  onRenameCategory: (kind: CategoryKind, oldName: string, newName: string) => boolean;
  onRemoveCategory: (kind: CategoryKind, name: string) => void;
  onAddEmployee: (name: string) => boolean;
  onRenameEmployee: (oldName: string, newName: string) => boolean;
  onRemoveEmployee: (name: string) => void;
  backupBusy: boolean;
  exportBackup: () => Promise<void>;
  importBackup: () => void;
  driveBackupBusy: boolean;
  driveBackupSettings: DriveBackupSettings;
  googleDriveConfigured: boolean;
  onConnectDrive: () => Promise<void>;
  onDisconnectDrive: () => Promise<void>;
  onSaveDriveBackupTime: (time: string) => Promise<void>;
  onToggleDriveBackup: (enabled: boolean) => Promise<void>;
  onRunDriveBackupNow: () => Promise<void>;
};

export default function SettingsScreen({
  productCategories,
  supplyCategories,
  employees,
  onAddCategory,
  onRenameCategory,
  onRemoveCategory,
  onAddEmployee,
  onRenameEmployee,
  onRemoveEmployee,
  backupBusy,
  exportBackup,
  importBackup,
  driveBackupBusy,
  driveBackupSettings,
  googleDriveConfigured,
  onConnectDrive,
  onDisconnectDrive,
  onSaveDriveBackupTime,
  onToggleDriveBackup,
  onRunDriveBackupNow,
}: SettingsScreenProps) {
  const { palette, styles } = useContext(ThemeContext);
  const [categoryDrafts, setCategoryDrafts] = useState<Record<CategoryKind, string>>({
    product: '',
    supply: '',
  });
  const [editingCategory, setEditingCategory] = useState<{
    kind: CategoryKind;
    oldName: string;
    newName: string;
  } | null>(null);
  const [employeeDraft, setEmployeeDraft] = useState('');
  const [editingEmployee, setEditingEmployee] = useState<{ oldName: string; newName: string } | null>(null);
  const [backupTimeDraft, setBackupTimeDraft] = useState<string | null>(null);
  const backupTime = backupTimeDraft ?? driveBackupSettings.time;
  const lastBackupDate = driveBackupSettings.lastBackupAt
    ? new Date(driveBackupSettings.lastBackupAt)
    : null;

  const addCategory = (kind: CategoryKind) => {
    if (onAddCategory(kind, categoryDrafts[kind])) {
      setCategoryDrafts((current) => ({ ...current, [kind]: '' }));
    }
  };

  const renderCategorySection = (kind: CategoryKind, title: string, categories: string[]) => (
    <>
      <SectionTitle title={title} />
      <View style={styles.listCard}>
        {categories.map((category, index) => {
          const isEditing = editingCategory?.kind === kind && editingCategory.oldName === category;
          return (
            <View key={category} style={[styles.settingsRow, index > 0 && styles.rowDivider]}>
              {isEditing ? (
                <TextInput
                  value={editingCategory.newName}
                  onChangeText={(newName) => setEditingCategory((current) => current && ({ ...current, newName }))}
                  placeholder="Nome da categoria"
                  placeholderTextColor={palette.muted}
                  style={styles.settingsRowInput}
                  maxLength={40}
                  returnKeyType="done"
                  accessibilityLabel={`Editar categoria ${category}`}
                />
              ) : (
                <Text style={styles.settingsRowName}>{category}</Text>
              )}
              <View style={styles.settingsActions}>
                {isEditing ? (
                  <>
                    <Pressable
                      onPress={() => {
                        if (editingCategory && onRenameCategory(kind, category, editingCategory.newName)) {
                          setEditingCategory(null);
                        }
                      }}
                      style={styles.saleActionButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Salvar categoria ${category}`}
                    >
                      <Text style={styles.saleActionText}>Salvar</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setEditingCategory(null)}
                      style={styles.saleActionButton}
                      accessibilityRole="button"
                      accessibilityLabel="Cancelar edição da categoria"
                    >
                      <Text style={styles.saleActionText}>Cancelar</Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    onPress={() => setEditingCategory({ kind, oldName: category, newName: category })}
                    style={styles.saleActionButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar categoria ${category}`}
                  >
                    <Text style={styles.saleActionText}>Editar</Text>
                  </Pressable>
                )}
                {!isEditing ? (
                  <Pressable
                    onPress={() => onRemoveCategory(kind, category)}
                    style={[styles.saleActionButton, styles.saleActionDanger]}
                    accessibilityRole="button"
                    accessibilityLabel={`Remover categoria ${category}`}
                  >
                    <Text style={[styles.saleActionText, styles.saleActionDangerText]}>Remover</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.settingsEntry}>
        <TextInput
          value={categoryDrafts[kind]}
          onChangeText={(value) => setCategoryDrafts((current) => ({ ...current, [kind]: value }))}
          placeholder="Nova categoria"
          placeholderTextColor={palette.muted}
          style={[styles.fieldInput, styles.settingsEntryInput]}
          maxLength={40}
          returnKeyType="done"
          onSubmitEditing={() => addCategory(kind)}
          accessibilityLabel={`Nova categoria de ${kind === 'product' ? 'produtos' : 'insumos'}`}
        />
        <Pressable
          onPress={() => addCategory(kind)}
          style={[styles.addEmployeeButton, styles.settingsAddButton]}
          accessibilityRole="button"
          accessibilityLabel={`Adicionar categoria de ${kind === 'product' ? 'produtos' : 'insumos'}`}
        >
          <Text style={styles.addEmployeeText}>+</Text>
        </Pressable>
      </View>
    </>
  );

  const addEmployee = () => {
    if (onAddEmployee(employeeDraft)) setEmployeeDraft('');
  };

  return (
    <>
      <Text style={styles.pageEyebrow}>PREFERÊNCIAS DO NEGÓCIO</Text>
      <View style={styles.pageHeadingRow}>
        <View>
          <Text style={styles.pageTitle}>Configurações</Text>
          <Text style={styles.pageSubtitle}>Gerencie categorias e funcionários</Text>
        </View>
      </View>

      {renderCategorySection('product', 'Categorias de produtos', productCategories)}
      {renderCategorySection('supply', 'Categorias de insumos', supplyCategories)}

      <SectionTitle title="Funcionários" />
      <Text style={styles.formIntro}>Editar um nome atualiza suas referências. Remover mantém registros históricos.</Text>
      <View style={styles.listCard}>
        {employees.map((employee, index) => {
          const isEditing = editingEmployee?.oldName === employee;
          return (
            <View key={employee} style={[styles.settingsRow, index > 0 && styles.rowDivider]}>
              {isEditing ? (
                <TextInput
                  value={editingEmployee.newName}
                  onChangeText={(newName) => setEditingEmployee((current) => current && ({ ...current, newName }))}
                  placeholder="Nome do funcionário"
                  placeholderTextColor={palette.muted}
                  style={styles.settingsRowInput}
                  maxLength={50}
                  returnKeyType="done"
                  accessibilityLabel={`Editar funcionário ${employee}`}
                />
              ) : (
                <Text style={styles.settingsRowName}>{employee}</Text>
              )}
              <View style={styles.settingsActions}>
                {isEditing ? (
                  <>
                    <Pressable
                      onPress={() => {
                        if (editingEmployee && onRenameEmployee(employee, editingEmployee.newName)) {
                          setEditingEmployee(null);
                        }
                      }}
                      style={styles.saleActionButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Salvar funcionário ${employee}`}
                    >
                      <Text style={styles.saleActionText}>Salvar</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setEditingEmployee(null)}
                      style={styles.saleActionButton}
                      accessibilityRole="button"
                      accessibilityLabel="Cancelar edição do funcionário"
                    >
                      <Text style={styles.saleActionText}>Cancelar</Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    onPress={() => setEditingEmployee({ oldName: employee, newName: employee })}
                    style={styles.saleActionButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar funcionário ${employee}`}
                  >
                    <Text style={styles.saleActionText}>Editar</Text>
                  </Pressable>
                )}
                {!isEditing ? (
                  <Pressable
                    onPress={() => onRemoveEmployee(employee)}
                    style={[styles.saleActionButton, styles.saleActionDanger]}
                    accessibilityRole="button"
                    accessibilityLabel={`Remover funcionário ${employee}`}
                  >
                    <Text style={[styles.saleActionText, styles.saleActionDangerText]}>Remover</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
        {employees.length === 0 ? <Text style={styles.emptyText}>Nenhum funcionário cadastrado.</Text> : null}
      </View>
      <View style={styles.settingsEntry}>
        <TextInput
          value={employeeDraft}
          onChangeText={setEmployeeDraft}
          placeholder="Nome do funcionário"
          placeholderTextColor={palette.muted}
          style={[styles.fieldInput, styles.settingsEntryInput]}
          maxLength={50}
          returnKeyType="done"
          onSubmitEditing={addEmployee}
          accessibilityLabel="Novo funcionário"
        />
        <Pressable
          onPress={addEmployee}
          style={[styles.addEmployeeButton, styles.settingsAddButton]}
          accessibilityRole="button"
          accessibilityLabel="Adicionar funcionário"
        >
          <Text style={styles.addEmployeeText}>+</Text>
        </Pressable>
      </View>

      <SectionTitle title="Backup e restauração" />
      <Text style={styles.fieldHint}>O arquivo JSON inclui os registros e as fotos dos produtos.</Text>
      <View style={styles.managementActions}>
        <ActionButton
          label={backupBusy ? 'Processando...' : 'Exportar backup'}
          onPress={() => void exportBackup()}
          secondary
          compact
        />
        <ActionButton
          label={backupBusy ? 'Processando...' : 'Importar backup'}
          onPress={importBackup}
          secondary
          compact
        />
      </View>

      <SectionTitle title="Backup diário no Google Drive" />
      {!googleDriveConfigured ? (
        <Text style={styles.fieldHint}>
          O Google Drive requer um development build e não funciona no Expo Go, pois depende de um módulo nativo.
          Em um build próprio, configure EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID e, no iOS,
          EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID. Crie um projeto Google Cloud, ative a Drive API
          e cadastre os clientes OAuth para Android (com.anonymous.trama e o SHA-1 da assinatura)
          e iOS. Depois gere um novo build do aplicativo.
        </Text>
      ) : null}
      <View style={styles.listCard}>
        <View style={styles.settingsRow}>
          <View style={styles.backupSettingsCopy}>
            <Text style={styles.settingsRowName}>
              {driveBackupSettings.accountEmail
                ? `Conectado: ${driveBackupSettings.accountEmail}`
                : 'Nenhuma conta Google conectada'}
            </Text>
            <Text style={styles.fieldHint}>
              {driveBackupSettings.enabled ? 'Backup automático ativado' : 'Backup automático desativado'}
            </Text>
          </View>
          <Pressable
            onPress={() => void (driveBackupSettings.accountEmail ? onDisconnectDrive() : onConnectDrive())}
            style={styles.saleActionButton}
            accessibilityRole="button"
            accessibilityLabel={driveBackupSettings.accountEmail ? 'Desconectar Google Drive' : 'Conectar Google Drive'}
          >
            <Text style={styles.saleActionText}>
              {driveBackupBusy ? 'Aguarde...' : driveBackupSettings.accountEmail ? 'Desconectar' : 'Conectar'}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.settingsRow, styles.rowDivider]}>
          <Text style={styles.settingsRowName}>Horário preferido</Text>
          <TextInput
            value={backupTime}
            onChangeText={setBackupTimeDraft}
            placeholder="21:00"
            placeholderTextColor={palette.muted}
            style={[styles.settingsRowInput, styles.backupTimeInput]}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            accessibilityLabel="Horário diário do backup"
          />
          <Pressable
            onPress={() => void onSaveDriveBackupTime(backupTime)}
            style={styles.saleActionButton}
            accessibilityRole="button"
            accessibilityLabel="Salvar horário do backup"
          >
            <Text style={styles.saleActionText}>Salvar</Text>
          </Pressable>
        </View>

        <Text style={[styles.fieldHint, styles.backupSettingsHint]}>
          O horário é uma preferência: Android e iOS decidem quando executar tarefas em segundo plano.
          A rotina pode atrasar e depende de rede, bateria e permissões do sistema.
        </Text>
        {driveBackupSettings.lastBackupAt ? (
          <Text style={styles.fieldHint}>
            Último backup: {lastBackupDate && !Number.isNaN(lastBackupDate.getTime())
              ? lastBackupDate.toLocaleString('pt-BR')
              : 'data indisponível'}
          </Text>
        ) : (
          <Text style={styles.fieldHint}>Nenhum backup enviado ainda.</Text>
        )}
        {driveBackupSettings.lastBackupError ? (
          <Text style={[styles.fieldHint, styles.backupErrorText]}>
            Última falha: {driveBackupSettings.lastBackupError}
          </Text>
        ) : null}
      </View>
      <View style={styles.managementActions}>
        <ActionButton
          label={driveBackupSettings.enabled ? 'Desativar backup diário' : 'Ativar backup diário'}
          onPress={() => void onToggleDriveBackup(!driveBackupSettings.enabled)}
          secondary
          compact
        />
        <ActionButton
          label={driveBackupBusy ? 'Enviando...' : 'Fazer backup agora'}
          onPress={() => void onRunDriveBackupNow()}
          secondary
          compact
        />
      </View>
      <View style={styles.bottomSpacer} />
    </>
  );
}
