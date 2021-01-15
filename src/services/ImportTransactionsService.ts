import { getRepository, getCustomRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionRepository from '../repositories/TransactionsRepository';



interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionRepository = getCustomRepository(TransactionRepository);
    const categoryRepository = getRepository(Category);
    //vai ler o arquivo filePath.
    const contacsReadStream = fs.createReadStream(filePath);
    const parsers = csvParse({
      //começa lendo da linha 2, pois a linha 1 no arquivo csv é o header
      from_line: 2,
      ltrim: true,
      rtrim: true,
      //demiliter: ';' - Oque delimita uma informação da outra, por padrão é a virgula, por isso nao informaremos
    });
    
    //Função pipe() ira ler as linhas conforme elas forem disponiveis
    const parseCSV = contacsReadStream.pipe(parsers);

    //Crio dois arrays para armazenar os dados do mapeamento da função parseCSV.on() neles e depois inserilos
    //no banco de dados, fazendo assim apenas umas abertura e fechemanto uma conexão com o banco de dados.
    //Melhorando a performance do sistema.
    const categories: string[] = [];
    const transactions: CSVTransaction[] = [];

    //função On('data') - em cada informação criamos uma arrow function que passa linha por linha do arquivo
    parseCSV.on('data', async line => {
      //após isso fazemos uma destruturação das linhas e mapeamos cada celula dessas linhas
      const [title, type, value, category] = line.map((cell:string) =>
      //depois utilizamos o trim() nas celulas para tirar os espaços em branco depois da virgula    
      cell.trim(),
      );
      
      //valida se todos os campos obrigatoris da linha estão preenchidos - category não é obrigatorio.
      if(!title || !type || !value) return;

      //função push para inserir os itens nos arrays
      categories.push(category);
      transactions.push({ title, type, value, category });

    });

      //promise feita, pois o parseCSV.on() não é 'em tempo real'
      //ou seja qnd a fução parseCSV emitir um evento end, após passar todas as linhas, ele irá retornar
      //os dados mapeados nessa Promise
      await new Promise(resolve => parseCSV.on('end', resolve));
      //utiliza a função find() para achar as categorias existentes dentro do banco de dados e do arquivo csv.
      //utiliza também o In do typeorm para comparar em grande escala, ou seja, array.
      const existentCategories = await categoryRepository.find({
        where: {
          title: In(categories),
        }
      });

      //faz um map para ter apenas dados necessarios no array, que seria o title
      const existentCategoriesTitle = existentCategories.map(
        (category: Category) => category.title,
      );

      
      //filta as categorias, negando a constante existentCategoriesTitle, trasendo apenas as categorias não
      //existentes no banco de dados.
      const addCategoryTitles = categories.filter(
        category => !existentCategoriesTitle.includes(category))
        .filter((value, index, self) => self.indexOf(value) === index);

      //mapeia as addCategoryTitles para ficar no formato de objeto, ex:
      //{
      //  title: "Food" 
      //},
      //{ 
      //  title: "Others"
      //}
      //
      const newCategories = categoryRepository.create(
        addCategoryTitles.map(
          (title) => ({
          title,
        })),
      );

      await categoryRepository.save(newCategories);

      //utiliza o spreed operator que junta as categorias novas com as existentes
      const finalCategories = [...newCategories, ...existentCategories]

      //faz um map() das transaçoes e depois um find nos repositorios para assimilar a categoria com a respectiva transação.
      const createdTransaction = transactionRepository.create(
        transactions.map((transactions) =>({
          title: transactions.title,
          type: transactions.type,
          value: transactions.value,
          category: finalCategories.find(
            (category) => category.title === transactions.category
            ),
        })),
      );

        await transactionRepository.save(createdTransaction);
        
        //apaga o csv da pasta tmp
        await fs.promises.unlink(filePath);
        
      return createdTransaction;
  }
}

export default ImportTransactionsService;
