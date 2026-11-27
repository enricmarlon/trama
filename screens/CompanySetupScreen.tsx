import { useContext } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { BASE_COLORS, BUSINESS_TYPES } from '../constants';
import ActionButton from '../components/ActionButton';
import { ThemeContext } from '../theme/ThemeContext';
import type useStoreData from '../hooks/useStoreData';

type StoreState = ReturnType<typeof useStoreData>;
type CompanySetupScreenProps = Pick<StoreState,
  'editingCompany'
  | 'businessType'
  | 'setBusinessType'
  | 'customBusinessType'
  | 'setCustomBusinessType'
  | 'businessName'
  | 'setBusinessName'
  | 'selectedColor'
  | 'setSelectedColor'
  | 'employeeDraft'
  | 'setEmployeeDraft'
  | 'addEmployee'
  | 'employees'
  | 'setEmployees'
  | 'backupBusy'
  | 'importBackup'
  | 'saveCompanyProfile'
  | 'setEditingCompany'
>;

export default function CompanySetupScreen({
  editingCompany,
  businessType,
  setBusinessType,
  customBusinessType,
  setCustomBusinessType,
  businessName,
  setBusinessName,
  selectedColor,
  setSelectedColor,
  employeeDraft,
  setEmployeeDraft,
  addEmployee,
  employees,
  setEmployees,
  backupBusy,
  importBackup,
  saveCompanyProfile,
  setEditingCompany
}: CompanySetupScreenProps) {
  const { palette, styles } = useContext(ThemeContext);
  return (
    <ScrollView
      style={styles.setupScreen}
      contentContainerStyle={styles.setupContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.setupBrand}>
        <View style={styles.brandMark}><Text style={styles.brandMarkText}>t.</Text></View>
        <View>
          <Text style={styles.brandName}>trama</Text>
          <Text style={styles.brandCaption}>gestão do seu negócio</Text>
        </View>
      </View>
      <Text style={styles.setupEyebrow}>SEU ESPAÇO, DO SEU JEITO</Text>
      <Text style={styles.setupTitle}>{editingCompany ? 'Perfil da empresa' : 'Vamos cadastrar sua empresa'}</Text>
      <Text style={styles.setupDescription}>Conte um pouco sobre seu estabelecimento para personalizar o aplicativo.</Text>

      <View style={styles.setupSection}>
        <Text style={styles.fieldLabel}>Qual é o tipo do estabelecimento?</Text>
        <View style={styles.businessTypeGrid}>
          {BUSINESS_TYPES.map((type) => (
            <Pressable
              key={type}
              onPress={() => setBusinessType(type)}
              style={[styles.businessTypeChip, businessType === type && styles.choiceChipSelected]}
              accessibilityRole="button"
              accessibilityState={{ selected: businessType === type }}
            >
              <Text style={[styles.choiceText, businessType === type && styles.choiceTextSelected]}>{type}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {businessType === 'Outro' ? (
        <View style={styles.setupSection}>
          <Text style={styles.fieldLabel}>Qual é o ramo?</Text>
          <TextInput
            value={customBusinessType}
            onChangeText={setCustomBusinessType}
            placeholder="Digite o tipo de estabelecimento"
            placeholderTextColor={palette.muted}
            style={styles.fieldInput}
            maxLength={50}
          />
        </View>
      ) : null}

      <View style={styles.setupSection}>
        <Text style={styles.fieldLabel}>Nome do estabelecimento</Text>
        <TextInput
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="Ex.: Ateliê Linha & Barro"
          placeholderTextColor={palette.muted}
          style={styles.fieldInput}
          maxLength={60}
          returnKeyType="next"
        />
      </View>

      <View style={styles.setupSection}>
        <Text style={styles.fieldLabel}>Cor principal do aplicativo</Text>
        <Text style={styles.fieldHint}>Vamos criar tons combinando e aplicar a paleta em toda a interface.</Text>
        <View style={styles.colorChoiceGrid}>
          {BASE_COLORS.map((color) => (
            <Pressable
              key={color.name}
              onPress={() => setSelectedColor(color.value)}
              style={[
                styles.colorChoice,
                { borderColor: selectedColor === color.value ? palette.green : palette.border },
                selectedColor === color.value && styles.colorChoiceSelected,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Selecionar cor ${color.name}`}
              accessibilityState={{ selected: selectedColor === color.value }}
            >
              <View style={[styles.colorSwatch, { backgroundColor: color.value }]} />
              <Text style={[styles.colorChoiceText, selectedColor === color.value && styles.choiceTextSelected]}>{color.name}</Text>
              {selectedColor === color.value ? <Text style={styles.colorCheck}>✓</Text> : null}
            </Pressable>
          ))}
        </View>
        <View style={styles.palettePreview}>
          <Text style={styles.palettePreviewLabel}>SUA PALETA</Text>
          <View style={styles.palettePreviewSwatches}>
            {[palette.green, palette.accentDeep, palette.paleGreen, palette.orange, palette.paleOrange].map((color, index) => (
              <View key={`${color}-${index}`} style={[styles.palettePreviewSwatch, { backgroundColor: color }]} />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.setupSection}>
        <Text style={styles.fieldLabel}>Funcionários <Text style={styles.optionalLabel}>(opcional)</Text></Text>
        <Text style={styles.fieldHint}>Você poderá selecionar quem realizou cada venda.</Text>
        <View style={styles.employeeEntry}>
          <TextInput
            value={employeeDraft}
            onChangeText={setEmployeeDraft}
            placeholder="Nome do funcionário"
            placeholderTextColor={palette.muted}
            style={[styles.fieldInput, styles.employeeInput]}
            maxLength={50}
            returnKeyType="done"
            onSubmitEditing={addEmployee}
          />
          <Pressable onPress={addEmployee} style={styles.addEmployeeButton} accessibilityRole="button" accessibilityLabel="Adicionar funcionário">
            <Text style={styles.addEmployeeText}>+</Text>
          </Pressable>
        </View>
        <View style={styles.employeeChipList}>
          {employees.map((employee) => (
            <Pressable
              key={employee}
              onPress={() => setEmployees((current) => current.filter((name) => name !== employee))}
              style={styles.employeeChip}
              accessibilityRole="button"
              accessibilityLabel={`Remover ${employee}`}
            >
              <Text style={styles.employeeChipText}>{employee}  ×</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.fieldHint}>Já usa o Trama? Importe um backup JSON com seus dados e fotos.</Text>
      <ActionButton
        label={backupBusy ? 'Processando backup...' : 'Importar backup'}
        onPress={importBackup}
        compact
      />
      <ActionButton label={editingCompany ? 'Salvar alterações' : 'Começar a usar o Trama'} onPress={saveCompanyProfile} />
      {editingCompany ? (
        <Pressable onPress={() => setEditingCompany(false)} style={styles.cancelEditButton} accessibilityRole="button">
          <Text style={styles.cancelEditText}>Cancelar</Text>
        </Pressable>
      ) : null}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}
