import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ModalNomeacaoMapaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editandoMapaId: string | null;
  nomeNovoMapa: string;
  setNomeNovoMapa: (nome: string) => void;
  onConfirmar: () => void;
}

export function ModalNomeacaoMapa({
  open,
  onOpenChange,
  editandoMapaId,
  nomeNovoMapa,
  setNomeNovoMapa,
  onConfirmar,
}: ModalNomeacaoMapaProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {editandoMapaId ? "Renomear Mapa" : "Salvar Mapa com Nome"}
          </DialogTitle>
          <DialogDescription>
            {editandoMapaId 
              ? "Digite o novo nome para o mapa" 
              : "Digite um nome para salvar este mapa"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            placeholder="Nome do mapa"
            value={nomeNovoMapa}
            onChange={(e) => setNomeNovoMapa(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                onConfirmar();
              }
            }}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setNomeNovoMapa("");
            }}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onConfirmar}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {editandoMapaId ? "Renomear" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
