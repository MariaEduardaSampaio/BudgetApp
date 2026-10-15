import { useState } from "react";
import BudgetActions from "../../src/components/BudgetActions";
import BudgetFormView from "../../src/components/BudgetFormView";
import WorkshopHero from "../../src/components/WorkshopHero";
import AppDialog from "../../src/components/ui/AppDialog";
import Button from "../../src/components/ui/Button";
import { useBudgetForm } from "../../src/hooks/useBudgetForm";
import { Budget, getBudgetTotal } from "../../src/services/budgetService";
import { formatBudgetNumber, formatMoney } from "../../src/utils/formatters";

export default function HomeScreen() {
  const form = useBudgetForm();
  const [generated, setGenerated] = useState<Budget | null>(null);

  const generate = async () => {
    const budget = await form.submit();
    if (budget) setGenerated(budget);
  };

  const startNew = () => {
    form.resetForm();
    setGenerated(null);
  };

  return (
    <>
      <BudgetFormView
        form={form}
        header={<WorkshopHero />}
        submitLabel="Gerar orçamento"
        submitIcon="document-text"
        onSubmit={generate}
      />

      <AppDialog
        visible={!!generated}
        icon="checkmark-circle"
        title={generated ? `Orçamento Nº ${formatBudgetNumber(generated.number)} pronto!` : ""}
        message={generated ? `${generated.client.name} · ${generated.vehicle.model} ${generated.vehicle.licensePlate}\nTotal: ${formatMoney(getBudgetTotal(generated))}\nSalvo no histórico.` : ""}
        onClose={() => setGenerated(null)}
      >
        {generated && <BudgetActions budget={generated} />}
        <Button title="Novo orçamento" icon="add" variant="secondary" onPress={startNew} />
        <Button title="Fechar" variant="ghost" onPress={() => setGenerated(null)} />
      </AppDialog>
    </>
  );
}
